import { Fragment, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowLeft, Check, Copy, History, MoreVertical, RefreshCw, Search, Send, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
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
  onBack: () => void;
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

function messageDayKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatMessageDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function CoupleConversation({ userId, onBack }: CoupleConversationProps) {
  const [state, setState] = useState<ConversationState>({ status: "loading" });
  const [draft, setDraft] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [olderMessagesError, setOlderMessagesError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "connected" | "offline">("connecting");
  const threadRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLFormElement>(null);
  const wasAtBottomRef = useRef(true);
  const previousMessageCountRef = useRef(0);
  const pendingScrollHeightRef = useRef<number | null>(null);
  const messageCount = state.status === "active" ? state.messages.length : 0;

  useEffect(() => {
    const thread = threadRef.current;
    if (state.status !== "active" || !thread) {
      previousMessageCountRef.current = 0;
      return;
    }

    const previousHeight = pendingScrollHeightRef.current;
    if (previousHeight !== null) {
      thread.scrollTop = thread.scrollHeight - previousHeight;
      pendingScrollHeightRef.current = null;
    } else {
      const isInitialLoad = previousMessageCountRef.current === 0 && messageCount > 0;
      if (isInitialLoad || wasAtBottomRef.current) {
        thread.scrollTo({
          top: thread.scrollHeight,
          behavior: isInitialLoad ? "auto" : "smooth",
        });
      }
    }
    previousMessageCountRef.current = messageCount;
  }, [state.status, messageCount]);

  const visibleMessages =
    state.status === "active"
      ? state.messages.filter((message) => {
          const normalize = (value: string) =>
            value
              .toLocaleLowerCase("pt-BR")
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "");
          const query = normalize(messageSearch.trim());
          return !query || normalize(message.body).includes(query);
        })
      : [];

  function handleThreadScroll() {
    const thread = threadRef.current;
    if (!thread) return;

    const distanceFromBottom =
      thread.scrollHeight - thread.scrollTop - thread.clientHeight;
    wasAtBottomRef.current = distanceFromBottom <= 80;
  }

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
                ),
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

  async function loadOlderMessages() {
    if (state.status !== "active" || !hasOlderMessages || loadingOlderMessages) return;
    const oldestMessage = state.messages[0];
    if (!oldestMessage) return;

    const thread = threadRef.current;
    pendingScrollHeightRef.current = thread?.scrollHeight ?? null;
    setLoadingOlderMessages(true);
    setOlderMessagesError(null);

    try {
      const result = await listCoupleMessages(state.coupleId, oldestMessage.created_at);
      if (result.error) throw result.error;

      const olderMessages = (result.data ?? []).slice().reverse();
      setHasOlderMessages((result.data ?? []).length === 100);
      if (olderMessages.length === 0) pendingScrollHeightRef.current = null;
      setState((current) => {
        if (current.status !== "active" || current.coupleId !== state.coupleId) return current;
        const existingIds = new Set(current.messages.map((message) => message.id));
        const uniqueOlder = olderMessages.filter((message) => !existingIds.has(message.id));
        return {
          ...current,
          messages: [...uniqueOlder, ...current.messages],
        };
      });
    } catch {
      pendingScrollHeightRef.current = null;
      setOlderMessagesError("Não foi possível carregar as mensagens anteriores.");
    } finally {
      setLoadingOlderMessages(false);
    }
  }

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
      if (Capacitor.isNativePlatform()) {
        void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
      }
      setRefreshKey((key) => key + 1);
    } catch {
      setError("Não foi possível enviar a mensagem. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  async function copyMessage(messageId: string, body: string) {
    setCopyError(null);
    setCopiedMessageId(null);

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("clipboard_unavailable");
      }
      await navigator.clipboard.writeText(body);
      setCopiedMessageId(messageId);
    } catch {
      setCopyError("Não foi possível copiar esta mensagem neste navegador.");
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;

    event.preventDefault();
    if (!busy && draft.trim()) composerRef.current?.requestSubmit();
  }

  return (
    <section className="conversation-screen" aria-labelledby="conversation-title">
      <header className="conversation-heading">
        <button
          type="button"
          className="conversation-back-button"
          onClick={onBack}
          aria-label="Voltar"
          title="Voltar"
        >
          <ArrowLeft aria-hidden="true" />
        </button>
        <span className="conversation-person-avatar" aria-hidden="true">♡</span>
        <div className="conversation-person-copy">
          <h1 id="conversation-title">Conversa</h1>
          <p className={`conversation-live-status is-${realtimeStatus}`} role="status">
            <span className="conversation-live-indicator" aria-hidden="true" />
            {state.status === "active"
              ? realtimeStatus === "connected" ? "online" : realtimeStatus === "connecting" ? "conectando…" : "atualização manual"
              : state.status === "pending" ? "aguardando convite" : state.status === "no-couple" ? "sem espaço vinculado" : " " }
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="conversation-options-button"
              aria-label="Mais opções da conversa"
              title="Mais opções"
            >
              <MoreVertical aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="conversation-options-menu">
            <DropdownMenuItem onSelect={() => setSearchOpen((open) => !open)}>
              <Search aria-hidden="true" />
              {searchOpen ? "Ocultar pesquisa" : "Pesquisar mensagens"}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!hasOlderMessages || loadingOlderMessages || state.status !== "active"}
              onSelect={() => void loadOlderMessages()}
            >
              <History aria-hidden="true" />
              {loadingOlderMessages ? "Carregando mensagens…" : "Carregar mensagens anteriores"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={busy || state.status === "loading"}
              onSelect={() => setRefreshKey((key) => key + 1)}
            >
              <RefreshCw aria-hidden="true" />
              Atualizar conversa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
          {searchOpen && (
            <div className="conversation-search-panel">
              <Search aria-hidden="true" />
              <input
                type="search"
                autoFocus
                value={messageSearch}
                onChange={(event) => setMessageSearch(event.target.value)}
                placeholder="Pesquisar nesta conversa"
                aria-label="Pesquisar mensagens"
              />
              <span className="conversation-search-count">{visibleMessages.length}</span>
              <button
                type="button"
                onClick={() => { setMessageSearch(""); setSearchOpen(false); }}
                aria-label="Fechar pesquisa"
              >
                <X aria-hidden="true" />
              </button>
            </div>
          )}
          <div ref={threadRef} onScroll={handleThreadScroll} className="conversation-thread" data-chrome-scroll role="log" aria-label="Mensagens do casal" aria-live="polite" aria-busy={loadingOlderMessages}>
            {olderMessagesError && <p className="conversation-history-error" role="alert">{olderMessagesError}</p>}
            {state.messages.length === 0 ? (
              <p className="conversation-state conversation-empty">
                Esta é a primeira conversa de vocês. Envie uma mensagem.
              </p>
            ) : visibleMessages.length === 0 ? (
              <p className="conversation-state conversation-empty">Nenhuma mensagem corresponde à busca.</p>
            ) : (
              visibleMessages.map((message, index) => {
                const ownMessage = message.sender_id === userId;
                const currentDay = messageDayKey(message.created_at);
                const previousMessage = visibleMessages[index - 1];
                const showDayDivider =
                  !previousMessage ||
                  messageDayKey(previousMessage.created_at) !== currentDay;

                return (
                  <Fragment key={message.id}>
                    {showDayDivider && (
                      <div className="conversation-day-divider" role="separator">
                        <span>{formatMessageDay(message.created_at)}</span>
                      </div>
                    )}
                    <article
                      className={ownMessage ? "conversation-message is-own" : "conversation-message"}
                    >
                      <div className="conversation-message-meta">
                        <span className="conversation-sender">
                          <span className="conversation-sender-mark" aria-hidden="true">
                            {ownMessage ? "EU" : "♡"}
                          </span>
                          {ownMessage ? "Você" : "A outra pessoa"}
                        </span>
                        <time dateTime={message.created_at}>
                          {formatMessageTime(message.created_at)}
                        </time>
                      </div>
                      <p>{message.body}</p>
                      <button
                        type="button"
                        className="conversation-copy-action"
                        onClick={() => void copyMessage(message.id, message.body)}
                        aria-label={copiedMessageId === message.id ? "Mensagem copiada" : "Copiar mensagem"}
                        title={copiedMessageId === message.id ? "Copiada" : "Copiar mensagem"}
                      >
                        {copiedMessageId === message.id ? (
                          <Check aria-hidden="true" />
                        ) : (
                          <Copy aria-hidden="true" />
                        )}
                        <span>{copiedMessageId === message.id ? "Copiada" : "Copiar"}</span>
                      </button>
                    </article>
                  </Fragment>
                );
              })
            )}
          </div>

          {copyError && <p className="conversation-error" role="alert">{copyError}</p>}
          <form ref={composerRef} className="conversation-composer" onSubmit={handleSend}>
            <label className="sr-only" htmlFor="conversation-draft">Mensagem</label>
            <textarea
              id="conversation-draft"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Mensagem"
              maxLength={2000}
              rows={1}
              onKeyDown={handleComposerKeyDown}
              disabled={busy}
            />
            <button
              type="submit"
              className="conversation-send-button"
              disabled={busy || draft.trim().length === 0}
              aria-label="Enviar mensagem"
              title="Enviar"
            >
              <Send aria-hidden="true" />
            </button>
            {error && <p className="conversation-error" role="alert">{error}</p>}
          </form>
        </>
      )}
    </section>
  );
}
