import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  File,
  Gift,
  History,
  Image,
  LoaderCircle,
  MoreVertical,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  Smile,
  Sticker,
  Video,
  X,
  Music2,
  Palette,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { supabase } from "@/integrations/supabase/client";
import {
  listCoupleMessages,
  sendCoupleMessage,
  type CoupleMessage,
  type CoupleMessageType,
} from "@/lib/couple-messages";
import {
  createCoupleMediaUrl,
  removeCoupleMedia,
  uploadCoupleMedia,
} from "@/lib/couple-media";

type WallpaperId = "paper" | "petals" | "confetti" | "night";

type ConversationState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "no-couple" }
  | { status: "pending" }
  | {
      status: "active";
      coupleId: string;
      messages: CoupleMessage[];
      otherName: string;
    };

type ConversationProps = {
  userId: string;
  onBack: () => void;
};

const wallpapers: { id: WallpaperId; title: string; description: string }[] = [
  { id: "paper", title: "Papel delicado", description: "Papel creme com pequenos pontos" },
  { id: "petals", title: "Chuva de pétalas", description: "Flores leves em tons quentes" },
  { id: "confetti", title: "Confetes", description: "Quadrinhos e formas coloridas" },
  { id: "night", title: "Noite estrelada", description: "Azul profundo e pequenas estrelas" },
];

const stickers = ["🥰", "💗", "🌷", "🐻", "🐱", "🧸", "✨", "💕", "🫶", "🌼", "💌", "☀️"];
const gifts = [
  { emoji: "🌷", title: "Um buquê de flores", note: "Um carinho em forma de flores" },
  { emoji: "🧸", title: "Um abraço de ursinho", note: "Um abraço para guardar" },
  { emoji: "🍫", title: "Um chocolate", note: "Um docinho para alegrar o dia" },
  { emoji: "💐", title: "Flores coloridas", note: "Só para lembrar que você é especial" },
  { emoji: "🎁", title: "Uma surpresa", note: "Tem um presente esperando por você" },
  { emoji: "💌", title: "Uma cartinha", note: "Uma pequena mensagem cheia de carinho" },
];

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

function normalizedMessage(value: CoupleMessage): CoupleMessage {
  return {
    ...value,
    message_type: value.message_type ?? "text",
    attachment_path: value.attachment_path ?? null,
    attachment_name: value.attachment_name ?? null,
    attachment_mime: value.attachment_mime ?? null,
    metadata: value.metadata ?? {},
  };
}

function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function messageDayKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate();
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

function initials(value: string) {
  return value.trim().split(/\s+/).slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("pt-BR") ?? "")
    .join("") || "♡";
}

function getLiveStatusText(
  status: ConversationState["status"],
  realtimeStatus: "connecting" | "connected" | "offline",
) {
  if (status === "active") {
    if (realtimeStatus === "connected") return "online agora";
    if (realtimeStatus === "connecting") return "conectando…";
    return "reconectando";
  }
  if (status === "pending") return "aguardando convite";
  if (status === "no-couple") return "sem vínculo ativo";
  return " ";
}

export function CoupleConversation({ userId, onBack }: ConversationProps) {
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
  const [wallpaper, setWallpaper] = useState<WallpaperId>("paper");
  const [wallpaperOpen, setWallpaperOpen] = useState(false);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [attachmentAccept, setAttachmentAccept] = useState("*/*");
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const threadRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wasAtBottomRef = useRef(true);
  const previousMessageCountRef = useRef(0);
  const pendingScrollHeightRef = useRef<number | null>(null);

  const messageCount = state.status === "active" ? state.messages.length : 0;
  const activeCoupleId = state.status === "active" ? state.coupleId : null;

  useEffect(() => {
    if (state.status !== "active") return;
    const key = "morados-chat-wallpaper:" + state.coupleId;
    try {
      const saved = window.localStorage.getItem(key);
      if (saved === "paper" || saved === "petals" || saved === "confetti" || saved === "night") {
        setWallpaper(saved);
      }
    } catch {
      // The wallpaper selection still works for this screen session.
    }
  }, [state.status, activeCoupleId]);

  useEffect(() => {
    if (state.status !== "active") return;
    try {
      window.localStorage.setItem("morados-chat-wallpaper:" + state.coupleId, wallpaper);
    } catch {
      // Storage can be disabled in embedded browsers.
    }
  }, [wallpaper, state.status, activeCoupleId]);

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

  useEffect(() => {
    if (state.status !== "active") return;
    let active = true;
    const attachments = state.messages.filter((message) => message.attachment_path);
    void Promise.all(
      attachments.map(async (message) => {
        const result = await createCoupleMediaUrl(message.attachment_path as string);
        return [message.id, result.url] as const;
      }),
    ).then((entries) => {
      if (!active) return;
      setMediaUrls((current) => ({
        ...current,
        ...Object.fromEntries(entries.filter((entry) => entry[1])),
      }));
    });
    return () => {
      active = false;
    };
  }, [state.status, state.status === "active" ? state.messages : []]);

  const visibleMessages =
    state.status === "active"
      ? state.messages.filter((message) => {
          const normalize = (value: string) =>
            value.toLocaleLowerCase("pt-BR")
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "");
          const query = normalize(messageSearch.trim());
          return !query || normalize(message.body).includes(query) ||
            normalize(message.attachment_name ?? "").includes(query);
        })
      : [];

  function handleThreadScroll() {
    const thread = threadRef.current;
    if (!thread) return;
    const distanceFromBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight;
    wasAtBottomRef.current = distanceFromBottom <= 90;
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

        let otherName = "Sua pessoa";
        const { data: partner } = await supabase
          .from("couple_members")
          .select("user_id")
          .eq("couple_id", couple.id)
          .neq("user_id", userId)
          .is("ended_at", null)
          .maybeSingle();

        if (partner?.user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", partner.user_id)
            .maybeSingle();
          if (profile?.display_name?.trim()) otherName = profile.display_name.trim();
        }

        const result = await listCoupleMessages(couple.id);
        if (result.error) throw result.error;
        if (!active) return;
        const messages = (result.data ?? []).slice().reverse().map(normalizedMessage);
        setHasOlderMessages((result.data ?? []).length === 100);
        setState({
          status: "active",
          coupleId: couple.id,
          messages,
          otherName,
        });
      } catch (cause) {
        console.error("Não foi possível carregar a conversa.", cause);
        if (active) setState({ status: "error" });
      }
    }

    void loadConversation();
    return () => {
      active = false;
    };
  }, [userId, refreshKey]);

  useEffect(() => {
    if (!activeCoupleId) {
      setRealtimeStatus("connecting");
      return;
    }

    let mounted = true;
    setRealtimeStatus("connecting");
    const channel = supabase
      .channel("couple-messages:" + activeCoupleId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "couple_messages",
          filter: "couple_id=eq." + activeCoupleId,
        },
        (payload) => {
          if (!isCoupleMessage(payload.new)) return;
          const incoming = normalizedMessage(payload.new);
          setState((current) => {
            if (
              current.status !== "active" ||
              current.coupleId !== activeCoupleId ||
              current.messages.some((message) => message.id === incoming.id)
            ) return current;
            return {
              ...current,
              messages: [...current.messages, incoming].sort(
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
        if (status === "SUBSCRIBED") setRealtimeStatus("connected");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
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
    const oldest = state.messages[0];
    if (!oldest) return;
    const thread = threadRef.current;
    pendingScrollHeightRef.current = thread?.scrollHeight ?? null;
    setLoadingOlderMessages(true);
    setOlderMessagesError(null);
    try {
      const result = await listCoupleMessages(state.coupleId, oldest.created_at);
      if (result.error) throw result.error;
      const older = (result.data ?? []).slice().reverse().map(normalizedMessage);
      setHasOlderMessages((result.data ?? []).length === 100);
      if (older.length === 0) pendingScrollHeightRef.current = null;
      setState((current) => {
        if (current.status !== "active" || current.coupleId !== state.coupleId) return current;
        const existing = new Set(current.messages.map((message) => message.id));
        return {
          ...current,
          messages: [...older.filter((message) => !existing.has(message.id)), ...current.messages],
        };
      });
    } catch {
      pendingScrollHeightRef.current = null;
      setOlderMessagesError("Não foi possível carregar as mensagens anteriores.");
    } finally {
      setLoadingOlderMessages(false);
    }
  }

  async function saveMessage(input: {
    body: string;
    messageType?: CoupleMessageType;
    attachmentPath?: string | null;
    attachmentName?: string | null;
    attachmentMime?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    if (state.status !== "active" || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await sendCoupleMessage({
        coupleId: state.coupleId,
        senderId: userId,
        ...input,
      });
      if (result.error) throw result.error;
      setDraft("");
      setAttachmentOpen(false);
      setStickerOpen(false);
      setGiftOpen(false);
      if (Capacitor.isNativePlatform()) {
        void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
      }
      setRefreshKey((key) => key + 1);
    } catch (cause) {
      console.error("Falha ao enviar mensagem.", cause);
      setError("Não foi possível enviar. Confira a conexão e tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || state.status !== "active" || busy) return;
    await saveMessage({ body, messageType: "text" });
  }

  async function sendAttachment(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || state.status !== "active" || busy) return;

    setBusy(true);
    setError(null);
    try {
      const uploaded = await uploadCoupleMedia({
        coupleId: state.coupleId,
        userId,
        scope: "chat",
        file,
      });
      if (uploaded.error || !uploaded.path) {
        throw uploaded.error ?? new Error("upload_failed");
      }

      const type: CoupleMessageType = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
          ? "video"
          : file.type.startsWith("audio/")
            ? "audio"
            : "file";
      const result = await sendCoupleMessage({
        coupleId: state.coupleId,
        senderId: userId,
        body: file.name || "Arquivo enviado",
        messageType: type,
        attachmentPath: uploaded.path,
        attachmentName: file.name,
        attachmentMime: file.type,
        metadata: { size: file.size },
      });
      if (result.error) {
        await removeCoupleMedia(uploaded.path);
        throw result.error;
      }
      setAttachmentOpen(false);
      setRefreshKey((key) => key + 1);
      if (Capacitor.isNativePlatform()) {
        void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
      }
    } catch (cause) {
      console.error("Falha ao enviar arquivo.", cause);
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar este arquivo.");
    } finally {
      setBusy(false);
    }
  }

  function openAttachmentPicker(accept: string) {
    setAttachmentAccept(accept);
    setAttachmentOpen(false);
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  }

  async function sendSticker(emoji: string) {
    await saveMessage({
      body: emoji,
      messageType: "sticker",
      metadata: { sticker: emoji },
    });
  }

  async function sendGift(gift: (typeof gifts)[number]) {
    await saveMessage({
      body: gift.title,
      messageType: "gift",
      metadata: { emoji: gift.emoji, title: gift.title, note: gift.note },
    });
  }

  async function copyMessage(messageId: string, body: string) {
    setCopyError(null);
    setCopiedMessageId(null);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard_unavailable");
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

  function renderMessageContent(message: CoupleMessage) {
    const url = mediaUrls[message.id];
    if (message.message_type === "sticker") {
      return <div className="conversation-sticker"><span>{message.body}</span></div>;
    }
    if (message.message_type === "gift") {
      const emoji = typeof message.metadata?.emoji === "string" ? message.metadata.emoji : "🎁";
      const title = typeof message.metadata?.title === "string" ? message.metadata.title : message.body;
      const note = typeof message.metadata?.note === "string" ? message.metadata.note : "Um presente para você";
      return (
        <div className="conversation-gift-card">
          <span className="conversation-gift-art">{emoji}</span>
          <span className="conversation-gift-kicker">Um carinho chegou</span>
          <strong>{title}</strong>
          <span>{note}</span>
        </div>
      );
    }
    if (message.message_type === "image") {
      return url ? (
        <a className="conversation-image-link" href={url} target="_blank" rel="noreferrer">
          <img src={url} alt={message.attachment_name || "Imagem enviada"} loading="lazy" />
        </a>
      ) : <p className="conversation-attachment-pending">Carregando foto…</p>;
    }
    if (message.message_type === "video") {
      return url ? (
        <video className="conversation-video" src={url} controls playsInline preload="metadata" />
      ) : <p className="conversation-attachment-pending">Carregando vídeo…</p>;
    }
    if (message.message_type === "audio") {
      return url ? (
        <div className="conversation-audio">
          <Music2 aria-hidden="true" />
          <audio src={url} controls preload="metadata" />
        </div>
      ) : <p className="conversation-attachment-pending">Carregando áudio…</p>;
    }
    if (message.message_type === "file") {
      return url ? (
        <a className="conversation-file-card" href={url} target="_blank" rel="noreferrer" download={message.attachment_name ?? undefined}>
          <File aria-hidden="true" />
          <span><strong>{message.attachment_name || "Arquivo"}</strong><small>Toque para abrir</small></span>
          <ArrowLeft aria-hidden="true" />
        </a>
      ) : <p className="conversation-attachment-pending">Carregando arquivo…</p>;
    }
    return <p className="conversation-message-text">{message.body}</p>;
  }

  return (
    <section className={"conversation-screen wallpaper-" + wallpaper} aria-labelledby="conversation-title">
      <header className="conversation-heading">
        <div className="conversation-heading-leading">
          <button
            type="button"
            className="conversation-back-button"
            onClick={onBack}
            aria-label="Voltar ao feed"
            title="Voltar"
          >
            <ArrowLeft aria-hidden="true" />
          </button>
        </div>

        <div className="conversation-person-copy">
          <span className="conversation-person-avatar" aria-hidden="true">
            {state.status === "active" ? initials(state.otherName) : "♡"}
          </span>
          <div className="conversation-person-text">
            <h1 id="conversation-title">{state.status === "active" ? state.otherName : "Conversa"}</h1>
            <p className={"conversation-live-status is-" + realtimeStatus} role="status">
              <span className="conversation-live-indicator" aria-hidden="true" />
              {getLiveStatusText(state.status, realtimeStatus)}
            </p>
          </div>
        </div>

        <div className="conversation-heading-trailing">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="conversation-options-button" aria-label="Configurações da conversa" title="Configurações">
                <MoreVertical aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="conversation-options-menu">
              <DropdownMenuItem onSelect={() => setSearchOpen((open) => !open)}>
                <Search aria-hidden="true" />
                {searchOpen ? "Ocultar pesquisa" : "Pesquisar mensagens"}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setWallpaperOpen((open) => !open)}>
                <Palette aria-hidden="true" />
                Papel de parede
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!hasOlderMessages || loadingOlderMessages || state.status !== "active"}
                onSelect={() => void loadOlderMessages()}
              >
                <History aria-hidden="true" />
                {loadingOlderMessages ? "Carregando…" : "Mensagens anteriores"}
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
        </div>
      </header>

      {wallpaperOpen && (
        <div className="conversation-wallpaper-panel" role="group" aria-label="Escolher papel de parede">
          {wallpapers.map((option) => (
            <button
              type="button"
              key={option.id}
              className={"conversation-wallpaper-choice wallpaper-" + option.id + (wallpaper === option.id ? " is-selected" : "")}
              onClick={() => { setWallpaper(option.id); setWallpaperOpen(false); }}
              aria-pressed={wallpaper === option.id}
            >
              <span className="conversation-wallpaper-swatch" />
              <span><strong>{option.title}</strong><small>{option.description}</small></span>
              {wallpaper === option.id && <Check aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}

      {state.status === "loading" && (
        <p className="conversation-state" role="status">Abrindo a conversa…</p>
      )}

      {state.status === "error" && (
        <div className="conversation-state">
          <p role="alert">Não foi possível carregar a conversa.</p>
          <button type="button" className="inline-action" onClick={() => setRefreshKey((key) => key + 1)}>
            Tentar novamente
          </button>
        </div>
      )}

      {state.status === "no-couple" && (
        <p className="conversation-state">Vincule a outra pessoa para começar a conversar.</p>
      )}

      {state.status === "pending" && (
        <p className="conversation-state">A conversa será liberada quando a outra pessoa aceitar o convite.</p>
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
              <button type="button" onClick={() => { setMessageSearch(""); setSearchOpen(false); }} aria-label="Fechar pesquisa">
                <X aria-hidden="true" />
              </button>
            </div>
          )}

          <div
            ref={threadRef}
            onScroll={handleThreadScroll}
            className="conversation-thread"
            data-chrome-scroll
            role="log"
            aria-label="Mensagens do casal"
            aria-live="polite"
            aria-busy={loadingOlderMessages}
          >
            {olderMessagesError && <p className="conversation-history-error" role="alert">{olderMessagesError}</p>}
            {state.messages.length === 0 ? (
              <div className="conversation-first-message">
                <span>♡</span>
                <strong>Um cantinho só de vocês.</strong>
                <p>Mandem mensagens, fotos, áudios e pequenos presentes para deixar esta conversa com a cara de vocês.</p>
              </div>
            ) : visibleMessages.length === 0 ? (
              <p className="conversation-state conversation-empty">Nenhuma mensagem corresponde à busca.</p>
            ) : (
              visibleMessages.map((message, index) => {
                const ownMessage = message.sender_id === userId;
                const currentDay = messageDayKey(message.created_at);
                const previousMessage = visibleMessages[index - 1];
                const showDayDivider = !previousMessage || messageDayKey(previousMessage.created_at) !== currentDay;

                return (
                  <Fragment key={message.id}>
                    {showDayDivider && (
                      <div className="conversation-day-divider" role="separator">
                        <span>{formatMessageDay(message.created_at)}</span>
                      </div>
                    )}
                    <article className={ownMessage ? "conversation-message is-own" : "conversation-message"}>
                      <div className="conversation-message-meta">
                        <span className="conversation-sender">{ownMessage ? "Você" : state.otherName}</span>
                        <time dateTime={message.created_at}>{formatMessageTime(message.created_at)}</time>
                      </div>
                      <div className={"conversation-message-content is-" + message.message_type}>
                        {renderMessageContent(message)}
                      </div>
                      <button
                        type="button"
                        className="conversation-copy-action"
                        onClick={() => void copyMessage(message.id, message.body)}
                        aria-label={copiedMessageId === message.id ? "Mensagem copiada" : "Copiar mensagem"}
                        title={copiedMessageId === message.id ? "Copiada" : "Copiar mensagem"}
                      >
                        {copiedMessageId === message.id ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                      </button>
                    </article>
                  </Fragment>
                );
              })
            )}
          </div>

          {copyError && <p className="conversation-error" role="alert">{copyError}</p>}
          {error && <p className="conversation-error" role="alert">{error}</p>}

          {(attachmentOpen || stickerOpen || giftOpen) && (
            <div className="conversation-tools-panel">
              {attachmentOpen && (
                <div className="conversation-attachment-grid">
                  <button type="button" onClick={() => openAttachmentPicker("image/*")}><Image aria-hidden="true" /><span>Fotos</span></button>
                  <button type="button" onClick={() => openAttachmentPicker("video/mp4,video/webm,video/quicktime")}><Video aria-hidden="true" /><span>Vídeos</span></button>
                  <button type="button" onClick={() => openAttachmentPicker("audio/*")}><Music2 aria-hidden="true" /><span>Áudios</span></button>
                  <button type="button" onClick={() => openAttachmentPicker("application/pdf,text/plain,application/zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}><File aria-hidden="true" /><span>Arquivos</span></button>
                </div>
              )}
              {stickerOpen && (
                <div className="conversation-sticker-grid">
                  {stickers.map((emoji) => (
                    <button type="button" key={emoji} onClick={() => void sendSticker(emoji)} disabled={busy}>{emoji}</button>
                  ))}
                </div>
              )}
              {giftOpen && (
                <div className="conversation-gift-grid">
                  {gifts.map((gift) => (
                    <button type="button" key={gift.title} onClick={() => void sendGift(gift)} disabled={busy}>
                      <span>{gift.emoji}</span>
                      <strong>{gift.title}</strong>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <form ref={composerRef} className="conversation-composer" onSubmit={handleSend}>
            <input
              ref={fileInputRef}
              type="file"
              accept={attachmentAccept}
              className="sr-only"
              onChange={(event) => void sendAttachment(event)}
              aria-label="Escolher arquivo para enviar"
            />
            <div className="conversation-composer-tools" aria-label="Ferramentas da conversa">
              <button
                type="button"
                className={attachmentOpen ? "is-active" : ""}
                onClick={() => { setAttachmentOpen((value) => !value); setStickerOpen(false); setGiftOpen(false); }}
                aria-label="Anexar mídia"
                title="Foto, vídeo, áudio ou arquivo"
              >
                <Paperclip aria-hidden="true" />
              </button>
              <button
                type="button"
                className={stickerOpen ? "is-active" : ""}
                onClick={() => { setStickerOpen((value) => !value); setAttachmentOpen(false); setGiftOpen(false); }}
                aria-label="Enviar figurinha"
                title="Figurinhas"
              >
                <Sticker aria-hidden="true" />
              </button>
              <button
                type="button"
                className={giftOpen ? "is-active" : ""}
                onClick={() => { setGiftOpen((value) => !value); setAttachmentOpen(false); setStickerOpen(false); }}
                aria-label="Enviar presente"
                title="Presentes"
              >
                <Gift aria-hidden="true" />
              </button>
            </div>
            <div className="conversation-input-shell">
              <label className="sr-only" htmlFor="conversation-draft">Mensagem</label>
              <textarea
                id="conversation-draft"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Escreva uma mensagem…"
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
                {busy ? <LoaderCircle aria-hidden="true" /> : <Send aria-hidden="true" />}
              </button>
            </div>
            <p className="conversation-composer-hint">Enter envia · Shift + Enter quebra a linha</p>
          </form>
        </>
      )}
    </section>
  );
}
