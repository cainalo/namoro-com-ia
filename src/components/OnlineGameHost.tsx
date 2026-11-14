import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Wifi, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  abandonMatch,
  canAct,
  classifyOnlineError,
  isNewer,
  loadActiveMatch,
  loadMatch,
  seatOf,
  startMatch,
  submitState,
  type GameOutcome,
  type OnlineGameMode,
  type OnlineMatch,
  type Seat,
} from "@/lib/online-game";

type SubmitOptions = { nextSeat: Seat | null; outcome?: GameOutcome | null };
export type OnlineGameContextValue = {
  match: OnlineMatch;
  userId: string;
  mySeat: Seat;
  canAct: boolean;
  submit: (data: unknown, options: SubmitOptions) => Promise<boolean>;
  refresh: () => Promise<void>;
};

const OnlineGameContext = createContext<OnlineGameContextValue | null>(null);

export function useOnlineGame() {
  return useContext(OnlineGameContext);
}

type GameStateOptions<S> = {
  turnSeat?: (state: S) => Seat | null;
  outcome?: (state: S) => GameOutcome | null;
};

/**
 * Substitui useState para o estado principal de um jogo. Fora do modo online
 * é um useState comum; dentro do OnlineGameHost lê e grava a partida compartilhada.
 */
export function useGameState<S>(initial: S | (() => S), options: GameStateOptions<S> = {}) {
  const ctx = useContext(OnlineGameContext);
  const [local, setLocal] = useState<S>(initial);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const value: S =
    ctx && ctx.match.version > 0 && ctx.match.state.data !== undefined
      ? (ctx.match.state.data as S)
      : local;
  const valueRef = useRef(value);
  valueRef.current = value;
  const initSent = useRef<string | null>(null);

  useEffect(() => {
    if (!ctx || ctx.match.version !== 0 || ctx.mySeat !== 0 || initSent.current === ctx.match.id)
      return;
    initSent.current = ctx.match.id;
    void ctx.submit(local, {
      nextSeat: optionsRef.current.turnSeat?.(local) ?? null,
      outcome: null,
    });
  }, [ctx, local]);

  const set = useCallback(
    (update: S | ((current: S) => S)) => {
      const next =
        typeof update === "function" ? (update as (current: S) => S)(valueRef.current) : update;
      if (!ctx) {
        setLocal(next);
        return;
      }
      valueRef.current = next;
      void ctx.submit(next, {
        nextSeat: optionsRef.current.turnSeat?.(next) ?? null,
        outcome: optionsRef.current.outcome?.(next) ?? null,
      });
    },
    [ctx],
  );

  return [
    value,
    set,
    { online: Boolean(ctx), mySeat: ctx?.mySeat ?? null, canAct: ctx?.canAct ?? true },
  ] as const;
}

type HostState =
  | { status: "loading" }
  | { status: "no-couple" }
  | { status: "pending" }
  | { status: "database-pending" }
  | { status: "error" }
  | { status: "ready"; coupleId: string };

export function OnlineGameHost({
  gameKey,
  mode,
  userId,
  children,
  seatLabels = ["Pessoa 1", "Pessoa 2"],
}: {
  gameKey: string;
  mode: OnlineGameMode;
  userId: string;
  children: ReactNode;
  seatLabels?: [string, string];
}) {
  const [hostState, setHostState] = useState<HostState>({ status: "loading" });
  const [match, setMatch] = useState<OnlineMatch | null>(null);
  const [finished, setFinished] = useState<OnlineMatch | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [realtime, setRealtime] = useState<"connecting" | "connected" | "offline">("connecting");
  const matchRef = useRef<OnlineMatch | null>(null);
  matchRef.current = match;
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const applyIncoming = useCallback((incoming: OnlineMatch) => {
    if (incoming.status !== "active") {
      setFinished(incoming);
      setMatch((current) => (current?.id === incoming.id ? null : current));
      return;
    }
    setMatch((current) => (isNewer(current, incoming) ? incoming : current));
  }, []);

  const load = useCallback(async () => {
    try {
      const membership = await supabase
        .from("couple_members")
        .select("couple_id")
        .eq("user_id", userId)
        .is("ended_at", null)
        .maybeSingle();
      if (membership.error) throw membership.error;
      if (!membership.data) return setHostState({ status: "no-couple" });
      const couple = await supabase
        .from("couples")
        .select("id, status")
        .eq("id", membership.data.couple_id)
        .maybeSingle();
      if (couple.error) throw couple.error;
      if (!couple.data || couple.data.status !== "active")
        return setHostState({ status: "pending" });
      const active = await loadActiveMatch(couple.data.id, gameKey);
      if (active.error) throw active.error;
      setMatch(active.data);
      setHostState({ status: "ready", coupleId: couple.data.id });
    } catch (cause) {
      setHostState({
        status:
          classifyOnlineError(cause as { code?: string }) === "database-pending"
            ? "database-pending"
            : "error",
      });
    }
  }, [gameKey, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const coupleId = hostState.status === "ready" ? hostState.coupleId : null;

  useEffect(() => {
    if (!coupleId) return;
    let mounted = true;
    setRealtime("connecting");
    const channel = supabase
      .channel(`online-game:${gameKey}:${coupleId}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "couple_game_matches",
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          const incoming = payload.new as OnlineMatch | undefined;
          if (!incoming || incoming.game_key !== gameKey || typeof incoming.version !== "number")
            return;
          applyIncoming(incoming);
        },
      )
      .subscribe((status) => {
        if (!mounted) return;
        if (status === "SUBSCRIBED") {
          setRealtime("connected");
          // Retomada: ao reconectar, busca o estado mais recente.
          const current = matchRef.current;
          if (current) void loadMatch(current.id).then((r) => r.data && applyIncoming(r.data));
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED")
          setRealtime("offline");
      });
    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [applyIncoming, coupleId, gameKey]);

  const refresh = useCallback(async () => {
    const current = matchRef.current;
    if (!current) return;
    const result = await loadMatch(current.id);
    if (result.data) {
      if (result.data.status !== "active") applyIncoming(result.data);
      else setMatch(result.data);
    }
  }, [applyIncoming]);

  const submit = useCallback(
    (data: unknown, options: SubmitOptions) => {
      const run = async () => {
        const current = matchRef.current;
        if (!current) return false;
        const optimistic: OnlineMatch = { ...current, state: { data } };
        matchRef.current = optimistic;
        setMatch(optimistic);
        const result = await submitState({
          matchId: current.id,
          expectedVersion: current.version,
          data,
          nextSeat: options.nextSeat,
          outcome: options.outcome ?? null,
        });
        if (result.error) {
          const kind = classifyOnlineError(result.error);
          setNotice(
            kind === "stale"
              ? "A outra pessoa jogou ao mesmo tempo. O jogo foi atualizado; tente de novo."
              : kind === "not-your-turn"
                ? "Ainda não é a sua vez."
                : kind === "finished"
                  ? "Essa partida já terminou."
                  : "Não foi possível sincronizar essa jogada.",
          );
          await refresh();
          return false;
        }
        setNotice(null);
        const nextTurn =
          options.nextSeat === null
            ? current.current_turn
            : options.nextSeat === 0
              ? current.player_one_id
              : current.player_two_id;
        const saved: OnlineMatch = {
          ...optimistic,
          version: current.version + 1,
          current_turn: nextTurn,
          status: options.outcome ? "finished" : "active",
        };
        if (options.outcome) {
          applyIncoming({ ...saved, finished_at: new Date().toISOString() });
        } else {
          matchRef.current = saved;
          setMatch((m) => (m && m.id === saved.id && m.version > saved.version ? m : saved));
        }
        return true;
      };
      const next = queue.current.then(run, run);
      queue.current = next;
      return next;
    },
    [applyIncoming, refresh],
  );

  async function start() {
    if (!coupleId || busy) return;
    setBusy(true);
    setNotice(null);
    setFinished(null);
    const result = await startMatch(coupleId, gameKey, mode);
    if (result.error || typeof result.data !== "string") {
      setNotice(
        classifyOnlineError(result.error) === "database-pending"
          ? "O banco ainda não recebeu a estrutura de partidas online."
          : "Não foi possível iniciar a partida online.",
      );
    } else {
      const loaded = await loadMatch(result.data);
      if (loaded.data) setMatch(loaded.data);
    }
    setBusy(false);
  }

  async function abandon() {
    if (!match || busy) return;
    if (!window.confirm("Encerrar esta partida para os dois aparelhos?")) return;
    setBusy(true);
    const result = await abandonMatch(match.id);
    if (result.error) setNotice("Não foi possível encerrar a partida.");
    else {
      setMatch(null);
      setFinished(null);
    }
    setBusy(false);
  }

  if (hostState.status !== "ready") {
    const text = {
      loading: "Carregando partida online…",
      "no-couple": "Conectem as duas contas na Casa para jogar online.",
      pending: "O jogo online fica disponível quando a outra pessoa aceitar o convite.",
      "database-pending":
        "O jogo online está preparado, mas o banco ainda não recebeu a estrutura de partidas.",
      error: "Não foi possível carregar a partida online.",
    }[hostState.status];
    return (
      <div className="couple-game-state online-game-state" role="status">
        <p>{text}</p>
        {hostState.status === "error" && (
          <button type="button" className="inline-action" onClick={() => void load()}>
            Tentar novamente
          </button>
        )}
      </div>
    );
  }

  const mySeat = match ? seatOf(match, userId) : null;

  if (!match || mySeat === null) {
    const result =
      finished && finished.status === "finished"
        ? finished.is_draw
          ? "A última partida terminou empatada."
          : finished.winner_id
            ? finished.winner_id === userId
              ? "Você venceu a última partida!"
              : "A outra pessoa venceu a última partida."
            : "Vocês concluíram a última partida juntos."
        : finished?.status === "abandoned"
          ? "A última partida foi encerrada."
          : null;
    return (
      <div className="couple-game-state online-game-state">
        {result && (
          <p role="status">
            <strong>{result}</strong>
          </p>
        )}
        <p>
          Uma partida compartilhada entre os dois aparelhos. Quem entrar depois continua do mesmo
          ponto.
        </p>
        <button
          type="button"
          className="inline-action"
          onClick={() => void start()}
          disabled={busy}
        >
          {busy ? "Iniciando…" : "Iniciar partida online"}
        </button>
        {notice && (
          <p className="couple-game-error" role="alert">
            {notice}
          </p>
        )}
      </div>
    );
  }

  const allowed = canAct(match, userId);
  const value: OnlineGameContextValue = { match, userId, mySeat, canAct: allowed, submit, refresh };
  const waitingSetup = match.version === 0 && mySeat === 1;

  return (
    <OnlineGameContext.Provider value={value}>
      <div className="online-game-bar" role="status" aria-live="polite">
        <span className={"online-game-dot is-" + realtime}>
          {realtime === "offline" ? <WifiOff aria-hidden="true" /> : <Wifi aria-hidden="true" />}
        </span>
        <span>
          {mode === "cooperative"
            ? "Progresso compartilhado"
            : waitingSetup
              ? "Aguardando a outra pessoa preparar a partida"
              : allowed
                ? "Sua vez"
                : "Vez da outra pessoa"}
          <small> · Você é {seatLabels[mySeat]}</small>
        </span>
        <button
          type="button"
          className="online-game-end"
          onClick={() => void abandon()}
          disabled={busy}
        >
          Encerrar
        </button>
      </div>
      {notice && (
        <p className="couple-game-error" role="alert">
          {notice}
        </p>
      )}
      <div
        className={"online-game-body" + (allowed && !waitingSetup ? "" : " is-locked")}
        inert={!allowed || waitingSetup ? true : undefined}
      >
        {children}
      </div>
    </OnlineGameContext.Provider>
  );
}
