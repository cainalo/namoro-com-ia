import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  listCoupleMessages,
  sendCoupleMessage,
  type CoupleMessage,
} from "@/lib/couple-messages";

type ConversationState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "no-couple" }
  | { status: "pending" }
  | { status: "active"; coupleId: string; messages: CoupleMessage[] };

type CoupleConversationProps = {
  userId: string;
};

function isCoupleMessage(value: unknown): value is CoupleMessage {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.couple_id === "string" &&
    typeof row.sender_id === "string" &&
    typeof row.body === "string" &&
    typeof row.created_at === "string"
  );
}

function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function CoupleConversation({ userId }: CoupleConversationProps) {
  const [state, setState] = useState<ConversationState>({ status: "loading" });
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "connected" | "offline">("connecting");

  useEffect(() => {
    let active = true;

    async function loadConversation() {
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
        if (!active) return;

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
        if (!active) return;

        if (!couple) {
          setState({ status: "no-couple" });
          return;
        }

        if (couple.status !== "active") {
          setState({ status: "pending" });
          return;
        }

        const result = await listCoupleMessages(couple.id);
        if (result.error) throw result.error;
        if (!active) return;

        setState({
          status: "active",
          coupleId: couple.id,
          messages: (result.data ?? []).slice().reverse(),
        });
      } catch {
        if (active) setState({ status: "error" });
      }
    }

    void loadConversation();

    return () => {
      active = false;
    };
  }, [userId, refreshKey]);

  const activeCoupleId = state.status === "active" ? state.coupleId : null;

  useEffect(() => {
    if (!activeCoupleId) {
      setRealtimeStatus("connecting");
      return;
    }

    let mounted = true;
    setRealtimeStatus("connecting");

    const channel = supabase
      .channel(`couple-messages:${activeCoupleId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "couple_messages",
          filter: `couple_id=eq.${activeCoupleId}`,
        },
        (payload) => {
          if (!isCoupleMessage(payload.new)) return;

          const incoming = payload.new;
          setState((current) => {
            if (
              current.status !== "active" ||
              current.coupleId !== activeCoupleId ||
              current.messages.some((message) => message.id === incoming.id)
            ) {
              return current;
            }

            return {
              ...current,
              messages: [...current.messages, incoming]
                .sort(
                  (left, right) =>
                    new Date(left.created_at).getTime() -
                    new Date(right.created_at).getTime(),
                )
                .slice(-100),
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
  }, [activeCoupleId]);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const current = state;
    const body = draft.trim();

    if (current.status !== "active" || !body || busy) return;

    setBusy(true);
    setError(null);

    try {
      const result = await sendCoupleMessage({
        coupleId: current.coupleId,
        senderId: userId,
        body,
      });

      if (result.error) throw result.error;

      setDraft("");
      setRefreshKey((key) => key + 1);
    } catch {
      setError("Não foi possível enviar a mensagem. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="conversation-screen" aria-labelledby="conversation-title">
      <header className="conversation-heading">
        <h1 id="conversation-title">Conversas</h1>
        {state.status === "active" && (
          <span className="conversation-live-status" role="status">
            {realtimeStatus === "connected"
              ? "Ao vivo"
              : realtimeStatus === "connecting"
                ? "Conectando…"
                : "Atualização manual"}
          </span>
        )}
        {state.status === "active" && (
          <button
            type="button"
            className="inline-action"
            onClick={() => setRefreshKey((key) => key + 1)}
            disabled={busy}
          >
            Atualizar
          </button>
        )}
      </header>

      {state.status === "loading" && (
        <p className="conversation-state" role="status">Carregando conversa…</p>
      )}

      {state.status === "error" && (
        <div className="conversation-state">
          <p role="alert">Não foi possível carregar a conversa.</p>
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
        <p className="conversation-state">
          Crie o espaço em Hoje e convide a outra pessoa para começar a conversar.
        </p>
      )}

      {state.status === "pending" && (
        <p className="conversation-state">
          A conversa será liberada quando a outra pessoa aceitar o convite.
        </p>
      )}

      {state.status === "active" && (
        <>
          <div className="conversation-thread" role="log" aria-label="Mensagens do casal" aria-live="polite">
            {state.messages.length === 0 ? (
              <p className="conversation-state conversation-empty">
                Esta é a primeira conversa de vocês. Envie uma mensagem.
              </p>
            ) : (
              state.messages.map((message) => {
                const ownMessage = message.sender_id === userId;

                return (
                  <article
                    key={message.id}
                    className={ownMessage ? "conversation-message is-own" : "conversation-message"}
                  >
                    <div className="conversation-message-meta">
                      <span>{ownMessage ? "Você" : "A outra pessoa"}</span>
                      <time dateTime={message.created_at}>
                        {formatMessageTime(message.created_at)}
                      </time>
                    </div>
                    <p>{message.body}</p>
                  </article>
                );
              })
            )}
          </div>

          <form className="conversation-composer" onSubmit={handleSend}>
            <label className="conversation-input-label" htmlFor="conversation-draft">
              Mensagem
            </label>
            <textarea
              id="conversation-draft"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Escreva uma mensagem…"
              maxLength={2000}
              rows={2}
              disabled={busy}
            />
            <div className="conversation-composer-footer">
              <span className="conversation-counter">{draft.length}/2000</span>
              <button
                type="submit"
                className="primary-action"
                disabled={busy || draft.trim().length === 0}
              >
                {busy ? "Enviando…" : "Enviar"}
              </button>
            </div>
            {error && <p className="conversation-error" role="alert">{error}</p>}
          </form>
        </>
      )}
    </section>
  );
}
