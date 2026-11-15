import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Clock3, Gamepad2, LoaderCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  cancelGameInvitation,
  invitationLaunch,
  onlineGameInvitationError,
  respondToGameInvitation,
  type OnlineGameLaunch,
} from "@/lib/game-invitations";
import "./GameInvitationCenter.css";

type InvitationRow = {
  id: string;
  couple_id: string;
  game_key: string;
  game_mode: "competitive" | "cooperative";
  from_user_id: string;
  to_user_id: string;
  status: "pending" | "accepted" | "declined" | "cancelled" | "expired";
  match_id: string | null;
  created_at: string;
  expires_at: string;
  responded_at: string | null;
};

type Props = {
  userId: string;
  onOpenGame: (launch: OnlineGameLaunch) => void;
};

const GAME_NAMES: Record<string, string> = {
  "connect-four": "Lig 4",
  checkers: "Damas brasileiras",
  "this-or-that": "Isto ou aquilo?",
  "daily-challenge": "Desafio do dia",
  investigation: "A Hospedagem dos Ausentes",
  "investigation-train": "O Último Trem de Santa Íria",
  chess: "Xadrez",
  battleship: "Batalha Naval",
  domino: "Dominó",
  truco: "Truco Paulista",
  quiz: "Quiz dos dois",
  "escape-room": "A sala do relógio",
  "island-survival": "Depois da tempestade",
  "cave-expedition": "As Ruínas de Morados",
};

const INVITATION_COLUMNS =
  "id,couple_id,game_key,game_mode,from_user_id,to_user_id,status,match_id,created_at,expires_at,responded_at";

function invitationTable() {
  return (supabase as unknown as { from: (table: string) => any }).from("couple_game_invitations");
}

function asInvitation(value: unknown): InvitationRow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    typeof row.game_key !== "string" ||
    typeof row.couple_id !== "string" ||
    typeof row.from_user_id !== "string" ||
    typeof row.to_user_id !== "string" ||
    (row.game_mode !== "competitive" && row.game_mode !== "cooperative") ||
    typeof row.status !== "string" ||
    typeof row.expires_at !== "string"
  ) return null;
  return row as unknown as InvitationRow;
}

export function GameInvitationCenter({ userId, onOpenGame }: Props) {
  const [pending, setPending] = useState<InvitationRow | null>(null);
  const [accepted, setAccepted] = useState<InvitationRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const openedIds = useRef(new Set<string>());

  const open = useCallback((row: InvitationRow) => {
    const launch = invitationLaunch(row as unknown as Record<string, unknown>);
    if (!launch || openedIds.current.has(row.id)) return;
    openedIds.current.add(row.id);
    setAccepted(null);
    setPending(null);
    setNotice(null);
    onOpenGame(launch);
  }, [onOpenGame]);

  const refresh = useCallback(async () => {
    const { data, error } = await invitationTable()
      .select(INVITATION_COLUMNS)
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .in("status", ["pending", "accepted"])
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) {
      console.error("Não foi possível atualizar os convites de partida.", error);
      return;
    }

    const rows = (Array.isArray(data) ? data : [])
      .map(asInvitation)
      .filter((row): row is InvitationRow => row !== null);

    const now = Date.now();
    const nextPending = rows.find((row) =>
      row.status === "pending" && new Date(row.expires_at).getTime() > now,
    ) ?? null;
    setPending(nextPending);

    const recentAccepted = rows.find((row) =>
      row.status === "accepted" &&
      row.responded_at &&
      Date.now() - new Date(row.responded_at).getTime() < 30 * 60 * 1000 &&
      !openedIds.current.has(row.id),
    ) ?? null;
    setAccepted(recentAccepted);

  }, [userId]);

  useEffect(() => {
    let mounted = true;
    const refreshSafely = () => {
      if (mounted) void refresh();
    };

    const channel = supabase
      .channel(`game-invitations:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "couple_game_invitations",
        },
        (payload) => {
          if (!mounted) return;
          const incoming = asInvitation(payload.new);
          if (!incoming || (incoming.from_user_id !== userId && incoming.to_user_id !== userId)) {
            refreshSafely();
            return;
          }

          if (incoming.status === "accepted") {
            open(incoming);
            return;
          }

          if (incoming.status === "declined") {
            setPending(null);
            window.dispatchEvent(new CustomEvent("morados:game-invitation-closed", { detail: { gameKey: incoming.game_key, invitationId: incoming.id, status: incoming.status } }));
            setNotice(incoming.from_user_id === userId
              ? "Sua namorada recusou o convite desta partida."
              : "Você recusou o convite da partida.");
          } else if (incoming.status === "cancelled") {
            setPending(null);
            window.dispatchEvent(new CustomEvent("morados:game-invitation-closed", { detail: { gameKey: incoming.game_key, invitationId: incoming.id, status: incoming.status } }));
            setNotice(incoming.to_user_id === userId
              ? "O convite de partida foi cancelado."
              : "Você cancelou o convite da partida.");
          } else if (incoming.status === "expired") {
            setPending(null);
            window.dispatchEvent(new CustomEvent("morados:game-invitation-closed", { detail: { gameKey: incoming.game_key, invitationId: incoming.id, status: incoming.status } }));
            setNotice("O convite de partida expirou.");
          } else {
            setPending(incoming);
            setAccepted(null);
            setNotice(null);
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") refreshSafely();
      });

    void refresh();
    const visibility = () => {
      if (document.visibilityState === "visible") refreshSafely();
    };
    document.addEventListener("visibilitychange", visibility);

    return () => {
      mounted = false;
      document.removeEventListener("visibilitychange", visibility);
      void supabase.removeChannel(channel);
    };
  }, [open, refresh, userId]);

  useEffect(() => {
    const row = pending;
    if (!row) return;
    const remaining = new Date(row.expires_at).getTime() - Date.now();
    if (remaining <= 0) {
      setPending(null);
      window.dispatchEvent(new CustomEvent("morados:game-invitation-closed", { detail: { gameKey: row.game_key, invitationId: row.id, status: "expired" } }));
      setNotice("O convite de partida expirou.");
      return;
    }
    const timer = window.setTimeout(() => {
      setPending(null);
      window.dispatchEvent(new CustomEvent("morados:game-invitation-closed", { detail: { gameKey: row.game_key, invitationId: row.id, status: "expired" } }));
      setNotice("O convite de partida expirou.");
      void refresh();
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [pending, refresh]);

  async function cancel() {
    if (!pending || pending.from_user_id !== userId || busy) return;
    setBusy(true);
    try {
      const { error } = await cancelGameInvitation(pending.id);
      if (error) throw error;
      setPending(null);
      window.dispatchEvent(new CustomEvent("morados:game-invitation-closed", { detail: { gameKey: pending.game_key, invitationId: pending.id, status: "cancelled" } }));
      setNotice("Convite cancelado. A partida não foi iniciada.");
    } catch (cause) {
      const failure = cause as { code?: string; message?: string };
      setNotice(onlineGameInvitationError(failure.message ?? "", failure.code));
    } finally {
      setBusy(false);
    }
  }

  async function answer(accept: boolean) {
    if (!pending || pending.to_user_id !== userId || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const { data, error } = await respondToGameInvitation(pending.id, accept);
      if (error) throw error;
      const raw = Array.isArray(data) ? data[0] : data;
      const resultRow = raw && typeof raw === "object" ? raw as Record<string, unknown> : null;
      const resultStatus = resultRow?.invitation_status;
      if (resultStatus === "expired") {
        setPending(null);
        window.dispatchEvent(new CustomEvent("morados:game-invitation-closed", { detail: { gameKey: pending.game_key, invitationId: pending.id, status: "expired" } }));
        setNotice("Este convite expirou. Peça para enviarem outro.");
        return;
      }
      if (resultStatus !== (accept ? "accepted" : "declined")) {
        throw new Error("Não foi possível confirmar a resposta do convite.");
      }

      const responded: InvitationRow = {
        ...pending,
        status: resultStatus,
        match_id: typeof resultRow?.match_id === "string" ? resultRow.match_id : null,
        responded_at: new Date().toISOString(),
      };
      setPending(null);
      if (accept) {
        open(responded);
      } else {
        window.dispatchEvent(new CustomEvent("morados:game-invitation-closed", { detail: { gameKey: pending.game_key, invitationId: pending.id, status: "declined" } }));
        setNotice("Convite recusado.");
      }
    } catch (cause) {
      const failure = cause as { code?: string; message?: string };
      setNotice(onlineGameInvitationError(failure.message ?? "", failure.code));
      void refresh();
    } finally {
      setBusy(false);
    }
  }

  function enterAccepted() {
    if (accepted) open(accepted);
  }

  const isIncoming = pending?.to_user_id === userId;
  const gameName = pending ? GAME_NAMES[pending.game_key] ?? "Jogo online" : "Jogo online";

  return (
    <>
      {pending && (
        <div className="game-invitation-backdrop" role="presentation">
          <section className="game-invitation-dialog" role="dialog" aria-modal="true" aria-labelledby="game-invitation-title">
            <div className="game-invitation-icon"><Gamepad2 /></div>
            <span className="game-invitation-kicker">
              {isIncoming ? "CONVITE PARA JOGAR" : "PARTIDA SUSPENSA"}
            </span>
            <h2 id="game-invitation-title">
              {isIncoming ? "Sua namorada quer jogar com você." : "Convite enviado."}
            </h2>
            <p className="game-invitation-game">{gameName}</p>
            <p className="game-invitation-copy">
              {isIncoming
                ? "O convite aparece sobre qualquer tela do Morados. Ao aceitar, vocês entram juntos na partida."
                : "A partida ainda não foi criada. Ela só começa quando sua namorada aceitar. Você pode cancelar agora ou continuar usando o aplicativo."}
            </p>
            <div className="game-invitation-expiry"><Clock3 /> {isIncoming ? "Convite válido por 15 minutos" : "Aguardando resposta · até 15 minutos"}</div>
            {isIncoming ? (
              <div className="game-invitation-actions">
                <button type="button" className="game-invitation-decline" onClick={() => void answer(false)} disabled={busy}>
                  <X /> Recusar
                </button>
                <button type="button" className="game-invitation-accept" onClick={() => void answer(true)} disabled={busy}>
                  {busy ? <LoaderCircle className="spin" /> : <Check />} Aceitar e jogar
                </button>
              </div>
            ) : (
              <div className="game-invitation-actions is-outgoing">
                <button type="button" className="game-invitation-cancel" onClick={() => void cancel()} disabled={busy}>
                  {busy ? <LoaderCircle className="spin" /> : <X />} Cancelar convite
                </button>
              </div>
            )}
            {notice && <p className="game-invitation-error" role="alert">{notice}</p>}
          </section>
        </div>
      )}

      {accepted && !pending && (
        <div className="game-invitation-backdrop" role="presentation">
          <section className="game-invitation-dialog" role="dialog" aria-modal="true" aria-labelledby="game-invitation-accepted-title">
            <div className="game-invitation-icon"><Check /></div>
            <span className="game-invitation-kicker">CONVITE ACEITO</span>
            <h2 id="game-invitation-accepted-title">A partida está pronta.</h2>
            <p className="game-invitation-game">{GAME_NAMES[accepted.game_key] ?? "Jogo online"}</p>
            <p className="game-invitation-copy">A outra pessoa aceitou. Entrem na partida para jogar juntos.</p>
            <button type="button" className="game-invitation-accept is-full" onClick={enterAccepted}>
              Entrar na partida <ArrowRight />
            </button>
          </section>
        </div>
      )}

      {notice && !pending && !accepted && (
        <div className="game-invitation-toast" role="status">
          <span>{notice}</span>
          <button type="button" aria-label="Fechar aviso" onClick={() => setNotice(null)}><X /></button>
        </div>
      )}
    </>
  );
}
