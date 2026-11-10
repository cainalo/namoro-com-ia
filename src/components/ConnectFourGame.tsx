import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  createConnectFourMatch,
  listConnectFourMatches,
  playConnectFourMove,
  type ConnectFourMatch,
} from "@/lib/connect-four";

type GameScreenState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "no-couple" }
  | { status: "pending" }
  | { status: "database-pending" }
  | {
      status: "ready";
      coupleId: string;
      matches: ConnectFourMatch[];
    };

function isConnectFourMatch(value: unknown): value is ConnectFourMatch {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.couple_id === "string" &&
    row.game_key === "connect-four" &&
    typeof row.player_one_id === "string" &&
    typeof row.player_two_id === "string" &&
    Array.isArray(row.board) &&
    row.board.length === 42 &&
    row.board.every((cell) => cell === 0 || cell === 1 || cell === 2) &&
    typeof row.current_turn === "string" &&
    (row.status === "active" || row.status === "finished") &&
    (typeof row.winner_id === "string" || row.winner_id === null) &&
    typeof row.is_draw === "boolean" &&
    typeof row.turn_number === "number" &&
    typeof row.created_at === "string" &&
    typeof row.updated_at === "string" &&
    (typeof row.finished_at === "string" || row.finished_at === null)
  );
}

function upsertMatch(
  matches: ConnectFourMatch[],
  incoming: ConnectFourMatch,
) {
  return [
    incoming,
    ...matches.filter((match) => match.id !== incoming.id),
  ]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 20);
}

function formatMatchDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ConnectFourGame({ userId }: { userId: string }) {
  const [state, setState] = useState<GameScreenState>({ status: "loading" });
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "connected" | "offline">("connecting");

  useEffect(() => {
    let mounted = true;

    async function loadGame() {
      setState({ status: "loading" });
      setError(null);

      try {
        const { data: membership, error: membershipError } = await supabase
          .from("couple_members")
          .select("couple_id")
          .eq("user_id", userId)
          .is("ended_at", null)
          .maybeSingle();

        if (membershipError) throw membershipError;
        if (!mounted) return;

        if (!membership) {
          setState({ status: "no-couple" });
          return;
        }

        const { data: couple, error: coupleError } = await supabase
          .from("couples")
          .select("id, status")
          .eq("id", membership.couple_id)
          .maybeSingle();

        if (coupleError) throw coupleError;
        if (!mounted) return;

        if (!couple) {
          setState({ status: "no-couple" });
          return;
        }

        if (couple.status !== "active") {
          setState({ status: "pending" });
          return;
        }

        const result = await listConnectFourMatches(couple.id);
        if (result.error) throw result.error;
        if (!mounted) return;

        const matches = (result.data ?? []).filter(isConnectFourMatch);
        setState({ status: "ready", coupleId: couple.id, matches });

        setSelectedMatchId((current) =>
          current && matches.some((match) => match.id === current)
            ? current
            : matches.find((match) => match.status === "active")?.id ??
              matches[0]?.id ??
              null,
        );
      } catch (cause) {
        if (!mounted) return;
        const failure = cause as { code?: string };
        if (failure.code === "42P01" || failure.code === "PGRST205") {
          setState({ status: "database-pending" });
        } else {
          setState({ status: "error" });
        }
      }
    }

    void loadGame();

    return () => {
      mounted = false;
    };
  }, [userId, refreshKey]);

  const coupleId = state.status === "ready" ? state.coupleId : null;

  useEffect(() => {
    if (!coupleId) {
      setRealtimeStatus("connecting");
      return;
    }

    let mounted = true;
    setRealtimeStatus("connecting");

    const channel = supabase
      .channel(`connect-four-matches:${coupleId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "couple_game_matches",
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          if (!isConnectFourMatch(payload.new)) return;
          const incoming = payload.new;

          setState((current) => {
            if (current.status !== "ready" || current.coupleId !== coupleId) {
              return current;
            }

            return {
              ...current,
              matches: upsertMatch(current.matches, incoming),
            };
          });
        },
      )
      .subscribe((status) => {
        if (!mounted) return;
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setRealtimeStatus("offline");
        }
      });

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [coupleId]);

  const matches = state.status === "ready" ? state.matches : [];
  const activeMatch = matches.find((match) => match.id === selectedMatchId) ?? null;
  const ongoingMatch = matches.find((match) => match.status === "active") ?? null;
  const hasActiveMatch = Boolean(ongoingMatch);
  const myToken =
    activeMatch?.player_one_id === userId ? 1 : 2;
  const myTurn =
    activeMatch?.status === "active" && activeMatch.current_turn === userId;
  const canPlay = Boolean(myTurn && !busy);
  const history = matches.filter((match) => match.status === "finished" && match.id !== activeMatch?.id);

  async function startMatch() {
    if (state.status !== "ready" || busy || hasActiveMatch) return;

    setBusy(true);
    setError(null);

    try {
      const result = await createConnectFourMatch(state.coupleId);
      if (result.error) throw result.error;
      if (!result.data) throw new Error("match_creation_failed");

      setSelectedMatchId(result.data);
      setRefreshKey((key) => key + 1);
    } catch (cause) {
      const failure = cause as { code?: string; message?: string };
      if (
        failure.code === "PGRST202" ||
        failure.code === "42883" ||
        failure.message?.includes("create_connect_four_match")
      ) {
        setState({ status: "database-pending" });
      } else {
        setError("Não foi possível iniciar a partida. Atualize e tente novamente.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function dropPiece(column: number) {
    if (
      state.status !== "ready" ||
      !activeMatch ||
      activeMatch.status !== "active" ||
      activeMatch.current_turn !== userId ||
      busy
    ) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const result = await playConnectFourMove({
        matchId: activeMatch.id,
        column,
        expectedTurn: activeMatch.turn_number,
      });

      if (result.error) throw result.error;
      if (!result.data || !isConnectFourMatch(result.data)) {
        throw new Error("invalid_match_response");
      }

      setState((current) => {
        if (current.status !== "ready") return current;
        return {
          ...current,
          matches: upsertMatch(current.matches, result.data!),
        };
      });
    } catch (cause) {
      const failure = cause as { code?: string; message?: string };
      if (
        failure.code === "PGRST202" ||
        failure.code === "42883" ||
        failure.message?.includes("play_connect_four_move")
      ) {
        setState({ status: "database-pending" });
      } else if (
        failure.message?.includes("not_your_turn") ||
        failure.message?.includes("stale_turn")
      ) {
        setError("A vez mudou. O tabuleiro foi atualizado; tente novamente.");
        setRefreshKey((key) => key + 1);
      } else if (failure.message?.includes("column_full")) {
        setError("Essa coluna está cheia. Escolha outra.");
      } else {
        setError("Não foi possível jogar essa peça. Atualize e tente novamente.");
      }
    } finally {
      setBusy(false);
    }
  }

  function matchOutcome(match: ConnectFourMatch) {
    if (match.status === "active") {
      return match.current_turn === userId ? "Sua vez" : "Vez do adversário";
    }
    if (match.is_draw) return "Empate";
    return match.winner_id === userId ? "Você venceu" : "Adversário venceu";
  }

  return (
    <section className="connect-four" aria-labelledby="connect-four-title">
      <header className="connect-four-heading">
        <div>
          <p className="date-kicker">Estratégia · 2 jogadores</p>
          <h2 id="connect-four-title">Lig 4</h2>
        </div>
        {state.status === "ready" && (
          <span className="couple-game-live-status" role="status">
            {realtimeStatus === "connected"
              ? "Ao vivo"
              : realtimeStatus === "connecting"
                ? "Conectando…"
                : "Atualização manual"}
          </span>
        )}
      </header>

      {state.status === "loading" && (
        <p className="couple-game-state" role="status">Carregando partidas…</p>
      )}

      {state.status === "error" && (
        <div className="couple-game-state">
          <p role="alert">Não foi possível carregar as partidas.</p>
          <button
            type="button"
            className="inline-action"
            onClick={() => setRefreshKey((key) => key + 1)}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {state.status === "no-couple" && (
        <p className="couple-game-state">
          Vincule a segunda conta para começar uma partida.
        </p>
      )}

      {state.status === "pending" && (
        <p className="couple-game-state">
          A partida ficará disponível quando a segunda conta aceitar o convite.
        </p>
      )}

      {state.status === "database-pending" && (
        <div className="couple-game-state">
          <p role="status">
            O Lig 4 está preparado, mas o banco de dados ainda não recebeu a estrutura necessária para criar e sincronizar partidas.
          </p>
          <button
            type="button"
            className="inline-action"
            onClick={() => setRefreshKey((key) => key + 1)}
          >
            Verificar novamente
          </button>
        </div>
      )}

      {state.status === "ready" && (
        <>
          {activeMatch?.status === "finished" && ongoingMatch && (
            <div className="connect-four-resume">
              <span>Há outra partida em andamento.</span>
              <button
                type="button"
                className="inline-action"
                onClick={() => setSelectedMatchId(ongoingMatch.id)}
              >
                Voltar à partida em andamento
              </button>
            </div>
          )}

          {!activeMatch ? (
            <div className="connect-four-start">
              <p>Conecte quatro peças antes do adversário. Vence quem completar primeiro uma linha horizontal, vertical ou diagonal.</p>
              <button
                type="button"
                className="primary-action"
                onClick={() => void startMatch()}
                disabled={busy || hasActiveMatch}
              >
                {busy ? "Preparando…" : "Iniciar partida"}
              </button>
            </div>
          ) : (
            <div className="connect-four-match">
              <div className="connect-four-match-status">
                <p className="connect-four-turn" role="status">
                  {activeMatch.status === "active"
                    ? matchOutcome(activeMatch)
                    : activeMatch.is_draw
                      ? "Empate"
                      : activeMatch.winner_id === userId
                        ? "Você venceu!"
                        : "Adversário venceu"}
                </p>
                <div className="connect-four-legend">
                  <span><i className="connect-four-piece is-player-one" />Você {myToken === 1 ? "(verde)" : "(terracota)"}</span>
                  <span><i className="connect-four-piece is-player-two" />Adversário {myToken === 2 ? "(verde)" : "(terracota)"}</span>
                </div>
              </div>

              <div className="connect-four-column-controls" aria-label="Escolha a coluna">
                {Array.from({ length: 7 }, (_, column) => {
                  const columnFull = activeMatch.board[35 + column] !== 0;
                  return (
                    <button
                      key={column}
                      type="button"
                      onClick={() => void dropPiece(column)}
                      disabled={!canPlay || columnFull || activeMatch.status !== "active"}
                      aria-label={`Coluna ${column + 1}`}
                    >
                      {column + 1}
                    </button>
                  );
                })}
              </div>

              <div className="connect-four-board" role="grid" aria-label="Tabuleiro de Lig 4">
                {[5, 4, 3, 2, 1, 0].map((row) => (
                  <div className="connect-four-row" role="row" key={row}>
                    {Array.from({ length: 7 }, (_, column) => {
                      const cell = activeMatch.board[(row * 7) + column];
                      const pieceClass =
                        cell === 1
                          ? "is-player-one"
                          : cell === 2
                            ? "is-player-two"
                            : "";
                      return (
                        <div
                          className="connect-four-cell"
                          role="gridcell"
                          aria-label={`Linha ${6 - row}, coluna ${column + 1}${cell === 0 ? ", vazia" : cell === 1 ? ", peça verde" : ", peça terracota"}`}
                          key={column}
                        >
                          <span className={["connect-four-piece", pieceClass].join(" ")} />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {activeMatch.status === "active" && !myTurn && (
                <p className="connect-four-waiting">Aguarde a jogada do adversário.</p>
              )}

              <div className="connect-four-actions">
                <button
                  type="button"
                  className="inline-action"
                  onClick={() => setRefreshKey((key) => key + 1)}
                  disabled={busy}
                >
                  Atualizar partida
                </button>
                {activeMatch.status === "finished" && (
                  <button
                    type="button"
                    className="primary-action"
                    onClick={() => void startMatch()}
                    disabled={busy || hasActiveMatch}
                  >
                    Jogar novamente
                  </button>
                )}
              </div>
            </div>
          )}

          {error && <p className="couple-game-error" role="alert">{error}</p>}

          {history.length > 0 && (
            <section className="connect-four-history" aria-labelledby="connect-four-history-title">
              <h3 id="connect-four-history-title">Partidas anteriores</h3>
              <ol>
                {history.map((match) => (
                  <li key={match.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedMatchId(match.id)}
                      aria-pressed={selectedMatchId === match.id}
                    >
                      <span>{formatMatchDate(match.created_at)}</span>
                      <strong>{matchOutcome(match)}</strong>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}
    </section>
  );
}
