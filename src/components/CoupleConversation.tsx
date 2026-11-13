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
  Camera,
  Coffee,
  Flower2,
  HandHeart,
  Mail,
  Mic,
  PawPrint,
  Sparkles,
  Square,
  Sun,
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
import { Capacitor } from "@capacitor/core";
import { MoradosMark } from "@/components/MoradosMark";
import { NativeAuth } from "@/lib/native-auth";
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
  MAX_COUPLE_MEDIA_BYTES,
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
      otherAvatarUrl: string | null;
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

const stickerOptions = [
  { id: "affection", label: "Carinho", Icon: HandHeart },
  { id: "flowers", label: "Flores", Icon: Flower2 },
  { id: "company", label: "Companhia", Icon: PawPrint },
  { id: "sparkle", label: "Brilho", Icon: Sparkles },
  { id: "sunshine", label: "Bom dia", Icon: Sun },
  { id: "letter", label: "Cartinha", Icon: Mail },
];
const giftArtworks = [
  { id: "flowers", label: "Flores", Icon: Flower2 },
  { id: "embrace", label: "Abraço", Icon: HandHeart },
  { id: "coffee", label: "Café", Icon: Coffee },
  { id: "letter", label: "Carta", Icon: Mail },
  { id: "surprise", label: "Surpresa", Icon: Gift },
  { id: "sunshine", label: "Luz do dia", Icon: Sun },
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

export function CoupleConversation({ userId, onBack }: ConversationProps) {
  const [state, setState] = useState<ConversationState>({ status: "loading" });
  const [draft, setDraft] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [olderMessagesError, setOlderMessagesError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [, setRealtimeStatus] = useState<"connecting" | "connected" | "offline">("connecting");
  const [wallpaper, setWallpaper] = useState<WallpaperId>("paper");
  const [wallpaperOpen, setWallpaperOpen] = useState(false);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [attachmentAccept, setAttachmentAccept] = useState("*/*");
  const [attachmentCapture, setAttachmentCapture] = useState<"environment" | undefined>(undefined);
  const [recordingAudio, setRecordingAudio] = useState(false);
  const [giftTitle, setGiftTitle] = useState("");
  const [giftNote, setGiftNote] = useState("");
  const [giftArtwork, setGiftArtwork] = useState("flowers");
  const [giftMediaFile, setGiftMediaFile] = useState<File | null>(null);
  const [giftMediaPreview, setGiftMediaPreview] = useState<string | null>(null);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const threadRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wasAtBottomRef = useRef(true);
  const previousMessageCountRef = useRef(0);
  const pendingScrollHeightRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (!giftMediaFile) {
      setGiftMediaPreview(null);
      return;
    }
    const previewUrl = URL.createObjectURL(giftMediaFile);
    setGiftMediaPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [giftMediaFile]);

  useEffect(() => {
    if (!settingsOpen) return;
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSettingsOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [settingsOpen]);

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

  const selectedGiftArtwork = giftArtworks.find((item) => item.id === giftArtwork) ?? giftArtworks[0];
  const SelectedGiftArtworkIcon = selectedGiftArtwork.Icon;

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
        let otherAvatarUrl: string | null = null;
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
            .select("display_name, avatar_path")
            .eq("id", partner.user_id)
            .maybeSingle();
          if (profile?.display_name?.trim()) otherName = profile.display_name.trim();
          if (profile?.avatar_path) {
            const avatar = await createCoupleMediaUrl(profile.avatar_path);
            otherAvatarUrl = avatar.url;
          }
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
          otherAvatarUrl,
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

  async function openNativeMessageComposer() {
    if (state.status !== "active" || busy) return;
    try {
      const result = await NativeAuth.showTextInputDialog({
        title: "Nova mensagem",
        hint: "Escreva uma mensagem…",
        initialValue: draft,
        confirmText: "Enviar",
        maxLength: 2000,
      });
      if (result.cancelled) return;
      const body = (result.text ?? "").trim();
      if (!body) return;
      await saveMessage({ body, messageType: "text" });
    } catch (cause) {
      console.error("Não foi possível abrir o campo nativo de mensagem.", cause);
      setError("Não foi possível abrir a escrita da mensagem. Tente novamente.");
    }
  }

  async function sendFile(file: File, messageTypeOverride?: CoupleMessageType, extraMetadata?: Record<string, unknown>) {
    if (state.status !== "active" || busy) return;
    setBusy(true);
    setError(null);
    try {
      const uploaded = await uploadCoupleMedia({ coupleId: state.coupleId, userId, scope: "chat", file });
      if (uploaded.error || !uploaded.path) throw uploaded.error ?? new Error("upload_failed");
      const inferredType: CoupleMessageType = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/") ? "video"
          : file.type.startsWith("audio/") ? "audio" : "file";
      const result = await sendCoupleMessage({
        coupleId: state.coupleId,
        senderId: userId,
        body: file.name || "Arquivo enviado",
        messageType: messageTypeOverride ?? inferredType,
        attachmentPath: uploaded.path,
        attachmentName: file.name,
        attachmentMime: file.type,
        metadata: { size: file.size, ...(extraMetadata ?? {}) },
      });
      if (result.error) {
        await removeCoupleMedia(uploaded.path);
        throw result.error;
      }
      setAttachmentOpen(false);
      setGiftOpen(false);
      setGiftMediaFile(null);
      setRefreshKey((key) => key + 1);
      if (Capacitor.isNativePlatform()) void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
    } catch (cause) {
      console.error("Falha ao enviar arquivo.", cause);
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar este arquivo.");
    } finally {
      setBusy(false);
    }
  }

  async function sendAttachment(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    setAttachmentCapture(undefined);
    if (file) await sendFile(file);
  }

  function handleGiftMediaChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setError("Escolha uma foto ou um vídeo para o presente.");
      return;
    }
    if (file.size > MAX_COUPLE_MEDIA_BYTES) {
      setError("A mídia do presente deve ter no máximo 35 MB.");
      return;
    }
    setError(null);
    setGiftMediaFile(file);
  }

  function openAttachmentPicker(accept: string, capture?: "environment") {
    setAttachmentAccept(accept);
    setAttachmentCapture(capture);
    setAttachmentOpen(false);
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  }

  async function toggleAudioRecording() {
    if (recordingAudio && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecordingAudio(false);
      return;
    }
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("Este dispositivo não oferece gravação de áudio neste navegador.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      recordingChunksRef.current = [];
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((candidate) => MediaRecorder.isTypeSupported(candidate));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size > 0) recordingChunksRef.current.push(event.data); };
      recorder.onerror = () => {
        setError("A gravação de áudio foi interrompida.");
        setRecordingAudio(false);
        stream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
      };
      recorder.onstop = () => {
        const mime = recorder.mimeType || "audio/webm";
        const extension = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
        const blob = new Blob(recordingChunksRef.current, { type: mime });
        stream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        mediaRecorderRef.current = null;
        recordingChunksRef.current = [];
        setRecordingAudio(false);
        if (blob.size > 0) void sendFile(new File([blob], "mensagem-de-voz." + extension, { type: mime }));
        else setError("A gravação ficou vazia. Tente novamente.");
      };
      recorder.start(250);
      setRecordingAudio(true);
      setAttachmentOpen(false);
      setStickerOpen(false);
      setGiftOpen(false);
    } catch (cause) {
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
      setRecordingAudio(false);
      setError(cause instanceof Error ? cause.message : "Não foi possível acessar o microfone.");
    }
  }

  async function sendSticker(sticker: (typeof stickerOptions)[number]) {
    await saveMessage({
      body: sticker.label,
      messageType: "sticker",
      metadata: { sticker: sticker.id, label: sticker.label },
    });
  }

  async function sendGift() {
    if (!giftTitle.trim() || state.status !== "active" || busy) return;
    setBusy(true);
    setError(null);
    let uploadedPath: string | null = null;
    try {
      let attachmentName: string | null = null;
      let attachmentMime: string | null = null;
      if (giftMediaFile) {
        const uploaded = await uploadCoupleMedia({ coupleId: state.coupleId, userId, scope: "chat", file: giftMediaFile });
        if (uploaded.error || !uploaded.path) {
          throw uploaded.error ?? new Error("Não foi possível adicionar a mídia ao presente.");
        }
        uploadedPath = uploaded.path;
        attachmentName = giftMediaFile.name;
        attachmentMime = giftMediaFile.type;
      }

      const result = await sendCoupleMessage({
        coupleId: state.coupleId,
        senderId: userId,
        body: giftTitle.trim(),
        messageType: "gift",
        attachmentPath: uploadedPath,
        attachmentName,
        attachmentMime,
        metadata: {
          artwork: selectedGiftArtwork.id,
          title: giftTitle.trim(),
          note: giftNote.trim() || "Um presente criado especialmente para você.",
        },
      });
      if (result.error) throw result.error;

      uploadedPath = null;
      setGiftTitle("");
      setGiftNote("");
      setGiftMediaFile(null);
      setGiftOpen(false);
      setRefreshKey((key) => key + 1);
      if (Capacitor.isNativePlatform()) {
        void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
      }
    } catch (cause) {
      console.error("Falha ao enviar presente.", cause);
      if (uploadedPath) {
        try {
          await removeCoupleMedia(uploadedPath);
        } catch {
          // Não substitui o erro original de envio.
        }
      }
      setError("Não foi possível enviar o presente. Seu texto e sua mídia foram mantidos para tentar novamente.");
    } finally {
      setBusy(false);
    }
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
      const stickerId = typeof message.metadata?.sticker === "string" ? message.metadata.sticker : "";
      const sticker = stickerOptions.find((item) => item.id === stickerId) ?? stickerOptions[0];
      const StickerIcon = sticker.Icon;
      return <div className="conversation-sticker"><StickerIcon aria-hidden="true" /><span>{sticker.label}</span></div>;
    }
    if (message.message_type === "gift") {
      const artworkId = typeof message.metadata?.artwork === "string" ? message.metadata.artwork : "";
      const artwork = giftArtworks.find((item) => item.id === artworkId) ?? giftArtworks[4];
      const GiftIcon = artwork.Icon;
      const title = typeof message.metadata?.title === "string" ? message.metadata.title : message.body;
      const note = typeof message.metadata?.note === "string" ? message.metadata.note : "Um presente para você";
      return (
        <div className="conversation-gift-card">
          {url && message.attachment_mime?.startsWith("image/") ? (
            <img className="conversation-gift-media" src={url} alt={title} loading="lazy" />
          ) : url && message.attachment_mime?.startsWith("video/") ? (
            <video className="conversation-gift-media" src={url} controls playsInline preload="metadata" />
          ) : (
            <span className="conversation-gift-art"><GiftIcon aria-hidden="true" /></span>
          )}
          <span className="conversation-gift-kicker">Uma criação para você</span>
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
    <section className={"conversation-screen wallpaper-" + wallpaper} aria-label="Conversa do casal">
      <header className="conversation-heading" data-no-swipe>
        <div className="conversation-heading-leading">
          <button
            type="button"
            className="conversation-back-button conversation-floating-action"
            onClick={onBack}
            aria-label="Voltar ao feed"
            title="Voltar"
          >
            <ArrowLeft aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          className="conversation-floating-wordmark"
          onClick={onBack}
          aria-label="Morados — voltar ao Feed"
          title="Feed"
        >
          <span className="morados-wordmark-lockup">
            <MoradosMark size={28} />
            <span className="morados-wordmark-text">morados</span>
          </span>
        </button>

        <div className="conversation-heading-trailing">
          <button
            type="button"
            className="conversation-options-button conversation-floating-action"
            aria-label="Configurações da conversa"
            aria-haspopup="menu"
            aria-expanded={settingsOpen}
            aria-controls="conversation-options-panel"
            title="Configurações"
            onClick={() => setSettingsOpen((open) => !open)}
          >
            <MoreVertical aria-hidden="true" />
          </button>
          {settingsOpen && (
            <div id="conversation-options-panel" className="conversation-options-panel" role="menu" aria-label="Configurações da conversa">
              <button
                type="button"
                className="conversation-options-item"
                role="menuitem"
                onClick={() => {
                  setSearchOpen((open) => !open);
                  setSettingsOpen(false);
                }}
              >
                <Search aria-hidden="true" />
                <span>{searchOpen ? "Ocultar pesquisa" : "Pesquisar mensagens"}</span>
              </button>
              <button
                type="button"
                className="conversation-options-item"
                role="menuitem"
                onClick={() => {
                  setWallpaperOpen((open) => !open);
                  setSettingsOpen(false);
                }}
              >
                <Palette aria-hidden="true" />
                <span>Papel de parede</span>
              </button>
              <button
                type="button"
                className="conversation-options-item"
                role="menuitem"
                disabled={!hasOlderMessages || loadingOlderMessages || state.status !== "active"}
                onClick={() => {
                  setSettingsOpen(false);
                  void loadOlderMessages();
                }}
              >
                <History aria-hidden="true" />
                <span>{loadingOlderMessages ? "Carregando…" : "Mensagens anteriores"}</span>
              </button>
              <div className="conversation-options-divider" role="separator" />
              <button
                type="button"
                className="conversation-options-item"
                role="menuitem"
                disabled={busy || state.status === "loading"}
                onClick={() => {
                  setSettingsOpen(false);
                  setRefreshKey((key) => key + 1);
                }}
              >
                <RefreshCw aria-hidden="true" />
                <span>Atualizar conversa</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {settingsOpen && (
        <button
          type="button"
          className="conversation-options-dismiss"
          aria-label="Fechar configurações da conversa"
          tabIndex={-1}
          onClick={() => setSettingsOpen(false)}
        />
      )}

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
                <span><HandHeart aria-hidden="true" /></span>
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
                  <button type="button" onClick={() => openAttachmentPicker("image/*")}><Image aria-hidden="true" /><span>Galeria</span></button>
                  <button type="button" onClick={() => openAttachmentPicker("image/*", "environment")}><Camera aria-hidden="true" /><span>Tirar foto</span></button>
                  <button type="button" onClick={() => openAttachmentPicker("video/*")}><Video aria-hidden="true" /><span>Vídeo</span></button>
                  <button type="button" onClick={() => openAttachmentPicker("video/*", "environment")}><Video aria-hidden="true" /><span>Gravar vídeo</span></button>
                  <button type="button" onClick={() => openAttachmentPicker("audio/*")}><Music2 aria-hidden="true" /><span>Enviar áudio</span></button>
                  <button type="button" onClick={() => openAttachmentPicker("application/pdf,text/plain,application/zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}><File aria-hidden="true" /><span>Arquivos</span></button>
                </div>
              )}
              {stickerOpen && (
                <div className="conversation-sticker-grid">
                  {stickerOptions.map((sticker) => {
                    const StickerIcon = sticker.Icon;
                    return <button type="button" key={sticker.id} onClick={() => void sendSticker(sticker)} disabled={busy} title={sticker.label}>
                      <StickerIcon aria-hidden="true" /><span>{sticker.label}</span>
                    </button>;
                  })}
                </div>
              )}
              {giftOpen && (
                <div className="conversation-gift-workshop">
                  <div className="conversation-gift-workshop-head">
                    <Gift aria-hidden="true" />
                    <div><strong>Oficina de presentes</strong><small>Monte um cartão com texto e mídia para enviar na conversa.</small></div>
                  </div>
                  <div className="conversation-gift-live-preview" aria-label="Prévia do cartão de presente">
                    <span className="conversation-gift-live-art">
                      {giftMediaPreview && giftMediaFile?.type.startsWith("image/") ? (
                        <img src={giftMediaPreview} alt="Prévia da foto do presente" />
                      ) : giftMediaPreview && giftMediaFile?.type.startsWith("video/") ? (
                        <video src={giftMediaPreview} controls playsInline preload="metadata" aria-label="Prévia do vídeo do presente" />
                      ) : (
                        <SelectedGiftArtworkIcon aria-hidden="true" />
                      )}
                    </span>
                    <div className="conversation-gift-live-copy">
                      <small>Prévia do cartão</small>
                      <strong>{giftTitle.trim() || "Um presente para você"}</strong>
                      <p>{giftNote.trim() || "Sua mensagem especial aparecerá aqui."}</p>
                    </div>
                  </div>
                  <div className="conversation-gift-artworks">
                    {giftArtworks.map((artwork) => {
                      const ArtworkIcon = artwork.Icon;
                      return <button type="button" key={artwork.id} className={giftArtwork === artwork.id ? "is-selected" : ""} onClick={() => setGiftArtwork(artwork.id)} aria-pressed={giftArtwork === artwork.id}>
                        <ArtworkIcon aria-hidden="true" /><span>{artwork.label}</span>
                      </button>;
                    })}
                  </div>
                  <label className="conversation-gift-field">Título<input value={giftTitle} onChange={(event) => setGiftTitle(event.target.value)} maxLength={70} placeholder="Um presente para você" /></label>
                  <label className="conversation-gift-field">Mensagem<textarea value={giftNote} onChange={(event) => setGiftNote(event.target.value)} maxLength={360} rows={3} placeholder="Escreva algo especial…" /></label>
                  <label className="conversation-gift-media-picker">
                    <Image aria-hidden="true" />
                    <span>{giftMediaFile ? "Trocar foto ou vídeo" : "Adicionar foto ou vídeo"}</span>
                    <input className="sr-only" type="file" accept="image/*,video/*" onChange={handleGiftMediaChange} />
                  </label>
                  {giftMediaFile && (
                    <div className="conversation-gift-media-selected">
                      <span><strong>{giftMediaFile.name}</strong><small>{(giftMediaFile.size / (1024 * 1024)).toFixed(1)} MB</small></span>
                      <button type="button" onClick={() => setGiftMediaFile(null)} aria-label="Remover mídia do presente" title="Remover mídia" disabled={busy}>
                        <X aria-hidden="true" />
                      </button>
                    </div>
                  )}
                  <button type="button" className="conversation-gift-send" onClick={() => void sendGift()} disabled={busy || !giftTitle.trim()}>
                    {busy ? <LoaderCircle aria-hidden="true" /> : <Send aria-hidden="true" />}
                    {busy ? "Enviando presente…" : "Enviar presente"}
                  </button>
                </div>
              )}
            </div>
          )}

          <form ref={composerRef} className="conversation-composer" data-no-swipe onSubmit={handleSend}>
            <input
              ref={fileInputRef}
              type="file"
              accept={attachmentAccept}
              capture={attachmentCapture}
              className="sr-only"
              onChange={(event) => void sendAttachment(event)}
              aria-label="Escolher arquivo para enviar"
            />
            <div className="conversation-composer-row">
              <div className="conversation-composer-tools" aria-label="Ferramentas da conversa">
                <button
                  type="button"
                  className={attachmentOpen ? "is-active" : ""}
                  onClick={() => { setAttachmentOpen((value) => !value); setStickerOpen(false); setGiftOpen(false); }}
                  aria-label="Anexar mídia"
                  title="Foto, vídeo, áudio ou arquivo"
                  disabled={busy}
                >
                  <Paperclip aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={stickerOpen ? "is-active" : ""}
                  onClick={() => { setStickerOpen((value) => !value); setAttachmentOpen(false); setGiftOpen(false); }}
                  aria-label="Enviar figurinha"
                  title="Figurinhas"
                  disabled={busy}
                >
                  <Sticker aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={giftOpen ? "is-active" : ""}
                  onClick={() => { setGiftOpen((value) => !value); setAttachmentOpen(false); setStickerOpen(false); }}
                  aria-label="Abrir oficina de presentes"
                  title="Oficina de presentes"
                  disabled={busy}
                >
                  <Gift aria-hidden="true" />
                </button>
              </div>
              <div className="conversation-input-shell">
                {Capacitor.isNativePlatform() ? (
                  <button
                    type="button"
                    className="conversation-native-message-trigger flex min-h-[38px] min-w-0 flex-1 items-center bg-transparent px-0 py-2 text-left text-sm text-muted-foreground disabled:cursor-wait disabled:opacity-60"
                    onClick={() => void openNativeMessageComposer()}
                    disabled={busy || state.status !== "active"}
                    aria-label="Escrever mensagem"
                  >
                    {draft.trim() || "Escreva uma mensagem…"}
                  </button>
                ) : (
                  <>
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
                  </>
                )}
                {(!draft.trim() || Capacitor.isNativePlatform()) ? (
                  <button
                    type="button"
                    className={"conversation-audio-button" + (recordingAudio ? " is-recording" : "")}
                    onClick={() => void toggleAudioRecording()}
                    aria-label={recordingAudio ? "Parar gravação de áudio" : "Gravar áudio"}
                    title={recordingAudio ? "Parar gravação" : "Gravar áudio"}
                    disabled={busy || state.status !== "active"}
                  >
                    {recordingAudio ? <Square aria-hidden="true" /> : <Mic aria-hidden="true" />}
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="conversation-send-button"
                    disabled={busy || draft.trim().length === 0}
                    aria-label="Enviar mensagem"
                    title="Enviar"
                  >
                    {busy ? <LoaderCircle aria-hidden="true" /> : <Send aria-hidden="true" />}
                  </button>
                )}
              </div>
            </div>
            <p className="conversation-composer-hint">{recordingAudio ? "Gravando áudio… toque novamente para finalizar" : "Enter envia · Shift + Enter quebra a linha"}</p>
          </form>
        </>
      )}
    </section>
  );
}
