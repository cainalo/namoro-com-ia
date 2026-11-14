import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type CSSProperties,
} from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Pencil,
  Star,
  Trash2,
  File,
  Image,
  Camera,
  HandHeart,
  Mic,
  Square,
  LoaderCircle,
  MoreVertical,
  Paperclip,
  Search,
  Send,
  Smile,
  Video,
  Phone,
  X,
  Music2,
  Pause,
  Play,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { ConversationCallScreen, type CallKind } from "@/components/ConversationCallScreen";
import { readableInk } from "@/lib/readable-ink";
import { ConversationAudioPlayer } from "@/components/ConversationAudioPlayer";
import { MoradosCamera, type MoradosCameraMode } from "@/components/MoradosCamera";
import { CoupleConversationSettings } from "@/components/CoupleConversationSettings";
import { mapWithConcurrency } from "@/lib/async-pool";
import {
  DEFAULT_CONVERSATION_APPEARANCE,
  DEFAULT_CONVERSATION_NOTIFICATIONS,
  loadConversationAppearance,
  loadConversationNotifications,
  readLocalConversationAppearance,
  readLocalConversationNotifications,
  saveConversationAppearance,
  saveConversationNotifications,
  type ConversationAppearance,
  type ConversationNotificationPreferences,
} from "@/lib/couple-conversation-settings";
import { NativeAuth } from "@/lib/native-auth";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { supabase } from "@/integrations/supabase/client";
import {
  listCoupleMessages,
  sendCoupleMessage,
  updateCoupleMessage,
  deleteCoupleMessage,
  type CoupleMessage,
  type CoupleMessageType,
} from "@/lib/couple-messages";
import {
  createCoupleMediaUrl,
  removeCoupleMedia,
  uploadCoupleMedia,
} from "@/lib/couple-media";

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
  onNavigate: (section: "home" | "games" | "memories" | "organize" | "create-post") => void;
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

type AudioRecordingStatus = "idle" | "requesting" | "recording" | "paused" | "finalizing" | "ready";

function formatAudioDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
}

function compressAudioWaveform(samples: number[], barCount = 56): number[] {
  if (samples.length === 0) return [];
  const peaks = Array.from({ length: barCount }, (_, index) => {
    const start = Math.floor((index * samples.length) / barCount);
    const end = Math.max(start + 1, Math.floor(((index + 1) * samples.length) / barCount));
    let peak = 0;
    for (let sample = start; sample < Math.min(end, samples.length); sample += 1) {
      peak = Math.max(peak, samples[sample] ?? 0);
    }
    return peak;
  });
  const maximum = Math.max(0.08, ...peaks);
  return peaks.map((peak) => Math.round(Math.max(0.07, peak / maximum) * 100) / 100);
}

function readMessageAudioWaveform(message: CoupleMessage): number[] | undefined {
  const value = message.metadata?.waveform;
  if (!Array.isArray(value)) return undefined;
  const waveform = value
    .filter((item): item is number => typeof item === "number" && Number.isFinite(item))
    .slice(0, 96)
    .map((item) => Math.max(0.07, Math.min(1, item)));
  return waveform.length >= 8 ? waveform : undefined;
}

function readMessageAudioDuration(message: CoupleMessage): number | undefined {
  const value = message.metadata?.durationSeconds;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

async function readAudioFileDuration(file: File): Promise<number | undefined> {
  if (!file.type.startsWith("audio/")) return undefined;
  const url = URL.createObjectURL(file);
  const audio = document.createElement("audio");
  audio.preload = "metadata";

  return new Promise((resolve) => {
    let finished = false;
    const finish = (duration?: number) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      audio.onloadedmetadata = null;
      audio.onerror = null;
      audio.removeAttribute("src");
      audio.load();
      URL.revokeObjectURL(url);
      resolve(duration && Number.isFinite(duration) && duration > 0 ? duration : undefined);
    };
    const timeout = window.setTimeout(() => finish(), 2500);
    audio.onloadedmetadata = () => finish(audio.duration);
    audio.onerror = () => finish();
    audio.src = url;
    audio.load();
  });
}

export function CoupleConversation({ userId, onBack, onNavigate }: ConversationProps) {
  const [state, setState] = useState<ConversationState>({ status: "loading" });
  const [draft, setDraft] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsPageOpen, setSettingsPageOpen] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [olderMessagesError, setOlderMessagesError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [selectedActionMessageId, setSelectedActionMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [favoriteMessageIds, setFavoriteMessageIds] = useState<string[]>(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem("morados-favorite-messages-" + userId) : null;
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
    } catch {
      return [];
    }
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [, setRealtimeStatus] = useState<"connecting" | "connected" | "offline">("connecting");
  const [appearance, setAppearance] = useState<ConversationAppearance>(DEFAULT_CONVERSATION_APPEARANCE);
  const [notifications, setNotifications] = useState<ConversationNotificationPreferences>(DEFAULT_CONVERSATION_NOTIFICATIONS);
  const [appearanceSaving, setAppearanceSaving] = useState(false);
  const [notificationsSaving, setNotificationsSaving] = useState(false);
  const [appearanceSyncAvailable, setAppearanceSyncAvailable] = useState(false);
  const [notificationsSyncAvailable, setNotificationsSyncAvailable] = useState(false);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [backgroundImageError, setBackgroundImageError] = useState<string | null>(null);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [attachmentAccept, setAttachmentAccept] = useState("*/*");
  const [cameraMode, setCameraMode] = useState<MoradosCameraMode | null>(null);
  const [recordingStatus, setRecordingStatus] = useState<AudioRecordingStatus>("idle");
  const [recordingFile, setRecordingFile] = useState<File | null>(null);
  const [recordingPreviewUrl, setRecordingPreviewUrl] = useState<string | null>(null);
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0);
  const [recordingLevels, setRecordingLevels] = useState<number[]>(Array.from({ length: 34 }, () => 0.08));
  const [recordingWaveform, setRecordingWaveform] = useState<number[]>([]);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const mediaUrlsCacheRef = useRef<Record<string, string>>({});
  const mediaQueueRef = useRef<CoupleMessage[]>([]);
  const pendingMediaIdsRef = useRef(new Set<string>());
  const mediaSigningRef = useRef(false);
  const mountedRef = useRef(true);
  const settingsScrollTopRef = useRef(0);
  const settingsWasAtBottomRef = useRef(true);
  const messageHoldTimerRef = useRef<number | null>(null);
  const appearanceSaveTimerRef = useRef<number | null>(null);
  const notificationsSaveTimerRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingWaveformSamplesRef = useRef<number[]>([]);
  const recordingAudioContextRef = useRef<AudioContext | null>(null);
  const recordingAnalyserRef = useRef<AnalyserNode | null>(null);
  const recordingVisualFrameRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const recordingAccumulatedMsRef = useRef(0);
  const threadRef = useRef<HTMLDivElement>(null);
  const [callKind, setCallKind] = useState<CallKind | null>(null);
  const composerRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wasAtBottomRef = useRef(true);
  const previousMessageCountRef = useRef(0);
  const pendingScrollHeightRef = useRef<number | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (messageHoldTimerRef.current !== null) window.clearTimeout(messageHoldTimerRef.current);
      if (appearanceSaveTimerRef.current !== null) window.clearTimeout(appearanceSaveTimerRef.current);
      if (notificationsSaveTimerRef.current !== null) window.clearTimeout(notificationsSaveTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      }
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (recordingVisualFrameRef.current !== null) window.cancelAnimationFrame(recordingVisualFrameRef.current);
      if (recordingTimerRef.current !== null) window.clearInterval(recordingTimerRef.current);
      const audioContext = recordingAudioContextRef.current;
      recordingAudioContextRef.current = null;
      if (audioContext && audioContext.state !== "closed") void audioContext.close();
    };
  }, []);

  useEffect(() => {
    if (!recordingFile) {
      setRecordingPreviewUrl(null);
      return;
    }
    const previewUrl = URL.createObjectURL(recordingFile);
    setRecordingPreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [recordingFile]);

  useEffect(() => {
    if (recordingStatus !== "recording") return;
    const updateElapsed = () => {
      const startedAt = recordingStartedAtRef.current;
      setRecordingElapsedMs(recordingAccumulatedMsRef.current + (startedAt === null ? 0 : Date.now() - startedAt));
    };
    updateElapsed();
    recordingTimerRef.current = window.setInterval(updateElapsed, 100);
    return () => {
      if (recordingTimerRef.current !== null) {
        window.clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    };
  }, [recordingStatus]);

  const messageCount = state.status === "active" ? state.messages.length : 0;
  const activeCoupleId = state.status === "active" ? state.coupleId : null;

  useEffect(() => {
    if (state.status !== "active") return;
    let active = true;
    const coupleId = state.coupleId;
    setAppearance(readLocalConversationAppearance(coupleId));
    setNotifications(readLocalConversationNotifications(coupleId, userId));
    void loadConversationAppearance(coupleId).then((value) => { if (active) setAppearance(value); });
    void loadConversationNotifications(coupleId, userId).then((value) => { if (active) setNotifications(value); });
    return () => { active = false; };
  }, [state.status, activeCoupleId, userId]);

  useEffect(() => {
    const path = appearance.backgroundImagePath;
    if (!path) {
      setBackgroundImageUrl(null);
      setBackgroundImageError(null);
      return;
    }
    let active = true;
    setBackgroundImageError(null);
    void createCoupleMediaUrl(path)
      .then((result) => {
        if (result.error || !result.url) throw result.error ?? new Error("signed_url_missing");
        if (active) {
          setBackgroundImageUrl(result.url);
          setBackgroundImageError(null);
        }
      })
      .catch((cause) => {
        console.warn("Não foi possível carregar o papel de parede personalizado.", cause);
        if (active) {
          setBackgroundImageUrl(null);
          setBackgroundImageError("Não foi possível carregar a foto salva. Escolha a imagem novamente.");
        }
      });
    return () => { active = false; };
  }, [appearance.backgroundImagePath]);

  function updateAppearance(next: ConversationAppearance) {
    setAppearance(next);
    if (state.status !== "active") return;
    if (appearanceSaveTimerRef.current !== null) window.clearTimeout(appearanceSaveTimerRef.current);
    setAppearanceSaving(true);
    const coupleId = state.coupleId;
    appearanceSaveTimerRef.current = window.setTimeout(() => {
      void saveConversationAppearance(coupleId, userId, next)
        .then((synced) => { if (mountedRef.current) setAppearanceSyncAvailable(synced); })
        .finally(() => {
          appearanceSaveTimerRef.current = null;
          if (mountedRef.current) setAppearanceSaving(false);
        });
    }, 450);
  }

  function updateNotifications(next: ConversationNotificationPreferences) {
    setNotifications(next);
    if (state.status !== "active") return;
    if (notificationsSaveTimerRef.current !== null) window.clearTimeout(notificationsSaveTimerRef.current);
    setNotificationsSaving(true);
    const coupleId = state.coupleId;
    notificationsSaveTimerRef.current = window.setTimeout(() => {
      void saveConversationNotifications(coupleId, userId, next)
        .then((synced) => { if (mountedRef.current) setNotificationsSyncAvailable(synced); })
        .finally(() => {
          notificationsSaveTimerRef.current = null;
          if (mountedRef.current) setNotificationsSaving(false);
        });
    }, 250);
  }

  function openConversationSettings() {
    const thread = threadRef.current;
    settingsScrollTopRef.current = thread?.scrollTop ?? 0;
    settingsWasAtBottomRef.current = thread
      ? thread.scrollHeight - thread.scrollTop - thread.clientHeight <= 90
      : wasAtBottomRef.current;
    setSettingsPageOpen(true);
  }

  useEffect(() => {
    if (settingsPageOpen) return;
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      const thread = threadRef.current;
      if (!thread) return;
      if (settingsWasAtBottomRef.current) {
        scrollThreadToEnd("auto");
        secondFrame = window.requestAnimationFrame(() => scrollThreadToEnd("auto"));
      } else {
        thread.scrollTop = settingsScrollTopRef.current;
      }
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [settingsPageOpen]);

  useEffect(() => {
    const thread = threadRef.current;
    if (state.status !== "active" || !thread) {
      previousMessageCountRef.current = 0;
      return;
    }

    const previousHeight = pendingScrollHeightRef.current;
    if (previousHeight !== null) {
      // Mensagens antigas entraram no topo: preserva a posição de leitura.
      thread.scrollTop = thread.scrollHeight - previousHeight;
      pendingScrollHeightRef.current = null;
    } else {
      const isInitialLoad = previousMessageCountRef.current === 0 && messageCount > 0;
      const last = state.messages[state.messages.length - 1];
      const ownNew = messageCount > previousMessageCountRef.current && last?.sender_id === userId;
      if (isInitialLoad || ownNew || wasAtBottomRef.current) {
        scrollThreadToEnd(isInitialLoad ? "auto" : "smooth");
      }
    }
    previousMessageCountRef.current = messageCount;
  }, [state.status, messageCount]);

  useEffect(() => {
    if (state.status !== "active") return;
    for (const message of state.messages) {
      if (!message.attachment_path || mediaUrlsCacheRef.current[message.id] || pendingMediaIdsRef.current.has(message.id)) continue;
      pendingMediaIdsRef.current.add(message.id);
      mediaQueueRef.current.push(message);
    }
    if (mediaSigningRef.current || mediaQueueRef.current.length === 0) return;

    mediaSigningRef.current = true;
    void (async () => {
      try {
        while (mediaQueueRef.current.length > 0) {
          const batch = mediaQueueRef.current.splice(0, 4);
          const entries = await mapWithConcurrency(batch, 4, async (message) => {
            try {
              const result = await createCoupleMediaUrl(message.attachment_path as string);
              return [message.id, result.url] as const;
            } catch (cause) {
              console.warn("Não foi possível preparar uma mídia da conversa.", cause);
              return [message.id, null] as const;
            }
          });
          for (const [messageId, url] of entries) {
            pendingMediaIdsRef.current.delete(messageId);
            if (url) mediaUrlsCacheRef.current[messageId] = url;
          }
          if (mountedRef.current && entries.some((entry) => entry[1])) {
            setMediaUrls({ ...mediaUrlsCacheRef.current });
          }
        }
      } catch (cause) {
        console.error("Falha ao preparar anexos da conversa.", cause);
      } finally {
        mediaSigningRef.current = false;
      }
    })();
  }, [state]);


  function appendSavedMessage(message: CoupleMessage) {
    setState((current) => {
      if (current.status !== "active" || current.messages.some((item) => item.id === message.id)) return current;
      return {
        ...current,
        messages: [...current.messages, message].sort(
          (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
        ),
      };
    });
  }

  const visibleMessages =
    state.status === "active"
      ? state.messages.filter((message) => {
          const legacyType = message.message_type as string;
          if (legacyType === "sticker" || legacyType === "gift") return false;
          const normalize = (value: string) =>
            value.toLocaleLowerCase("pt-BR")
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "");
          const query = normalize(messageSearch.trim());
          return !query || normalize(message.body).includes(query) ||
            normalize(message.attachment_name ?? "").includes(query);
        })
      : [];

  function scrollThreadToEnd(behavior: ScrollBehavior = "auto") {
    const thread = threadRef.current;
    if (!thread) return;
    // Fim exato: a última mensagem encosta no compositor, sem espaço extra.
    thread.scrollTo({ top: Math.max(0, thread.scrollHeight - thread.clientHeight), behavior });
    wasAtBottomRef.current = true;
  }

  useEffect(() => {
    const composer = composerRef.current;
    const thread = threadRef.current;
    if (state.status !== "active" || !composer || !thread) return;

    const updateClearance = () => {
      const composerTop = composer.getBoundingClientRect().top;
      const threadBottom = thread.getBoundingClientRect().bottom;
      // Reserva exatamente a distância entre o fim da área rolável e o topo
      // real da fileira de ferramentas, sem estimar a altura do formulário.
      const clearance = Math.max(0, Math.ceil(threadBottom - composerTop + 14));
      thread.style.setProperty("--conversation-composer-clearance", clearance + "px");
      if (wasAtBottomRef.current) {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            if (threadRef.current === thread && wasAtBottomRef.current) scrollThreadToEnd("auto");
          });
        });
      }
    };

    updateClearance();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateClearance);
    observer?.observe(composer);
    window.addEventListener("resize", updateClearance);
    window.visualViewport?.addEventListener("resize", updateClearance);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateClearance);
      window.visualViewport?.removeEventListener("resize", updateClearance);
      thread.style.removeProperty("--conversation-composer-clearance");
    };
  }, [state.status, recordingStatus, attachmentOpen, settingsPageOpen]);

  useEffect(() => {
    const thread = threadRef.current;
    if (state.status !== "active" || !thread) return;
    const keepPinned = () => {
      if (wasAtBottomRef.current) scrollThreadToEnd("auto");
    };
    // Mídia que termina de carregar ou teclado que reduz a área mantém o fim visível.
    thread.addEventListener("load", keepPinned, true);
    thread.addEventListener("loadedmetadata", keepPinned, true);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(keepPinned);
    observer?.observe(thread);
    return () => {
      thread.removeEventListener("load", keepPinned, true);
      thread.removeEventListener("loadedmetadata", keepPinned, true);
      observer?.disconnect();
    };
  }, [state.status, settingsPageOpen]);

  function handleThreadScroll() {
    const thread = threadRef.current;
    if (!thread) return;
    if (selectedActionMessageId) setSelectedActionMessageId(null);
    if (messageHoldTimerRef.current !== null) {
      window.clearTimeout(messageHoldTimerRef.current);
      messageHoldTimerRef.current = null;
    }
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
      if (result.data) appendSavedMessage(normalizedMessage(result.data));
      setDraft("");
      setAttachmentOpen(false);

      if (Capacitor.isNativePlatform()) {
        void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
      }
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

  async function sendFile(file: File, messageTypeOverride?: CoupleMessageType, extraMetadata?: Record<string, unknown>): Promise<boolean> {
    if (state.status !== "active" || busy) return false;
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
      if (result.data) appendSavedMessage(normalizedMessage(result.data));
      setAttachmentOpen(false);
      if (Capacitor.isNativePlatform()) void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
      return true;
    } catch (cause) {
      console.error("Falha ao enviar arquivo.", cause);
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar este arquivo.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function sendAttachment(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (file) {
      const durationSeconds = await readAudioFileDuration(file);
      await sendFile(file, undefined, durationSeconds ? { durationSeconds } : undefined);
    }
  }

  function openAttachmentPicker(accept: string) {
    setAttachmentAccept(accept);
    setAttachmentOpen(false);
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  }

  function stopRecordingVisualizer() {
    if (recordingVisualFrameRef.current !== null) {
      window.cancelAnimationFrame(recordingVisualFrameRef.current);
      recordingVisualFrameRef.current = null;
    }
  }

  function startRecordingVisualizer() {
    const analyser = recordingAnalyserRef.current;
    if (!analyser) return;
    stopRecordingVisualizer();
    const samples = new Uint8Array(analyser.fftSize);
    let lastPaintAt = 0;
    const draw = (timestamp: number) => {
      const activeAnalyser = recordingAnalyserRef.current;
      if (!activeAnalyser || mediaRecorderRef.current?.state !== "recording") {
        recordingVisualFrameRef.current = null;
        return;
      }
      if (timestamp - lastPaintAt >= 80) {
        lastPaintAt = timestamp;
        activeAnalyser.getByteTimeDomainData(samples);
        let energy = 0;
        for (let index = 0; index < samples.length; index += 1) {
          const normalized = (samples[index] - 128) / 128;
          energy += normalized * normalized;
        }
        const level = Math.max(0.08, Math.min(1, Math.sqrt(energy / samples.length) * 3.8));
        recordingWaveformSamplesRef.current.push(level);
        if (recordingWaveformSamplesRef.current.length > 12000) recordingWaveformSamplesRef.current.shift();
        setRecordingLevels((current) => [...current.slice(1), level]);
      }
      recordingVisualFrameRef.current = window.requestAnimationFrame(draw);
    };
    recordingVisualFrameRef.current = window.requestAnimationFrame(draw);
  }

  function releaseRecordingResources(stream: MediaStream) {
    stream.getTracks().forEach((track) => track.stop());
    if (recordingStreamRef.current === stream) recordingStreamRef.current = null;
    recordingAnalyserRef.current = null;
    stopRecordingVisualizer();
    const audioContext = recordingAudioContextRef.current;
    recordingAudioContextRef.current = null;
    if (audioContext && audioContext.state !== "closed") void audioContext.close();
  }

  async function startAudioRecording() {
    if (state.status !== "active" || busy || recordingStatus !== "idle") return;
    setError(null);
    setRecordingStatus("requesting");
    setRecordingFile(null);
    setRecordingWaveform([]);
    recordingWaveformSamplesRef.current = [];
    setRecordingElapsedMs(0);
    setRecordingLevels(Array.from({ length: 34 }, () => 0.08));
    recordingAccumulatedMsRef.current = 0;
    recordingStartedAtRef.current = null;

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

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setError("A gravação de áudio foi interrompida.");
        setRecordingStatus("idle");
        mediaRecorderRef.current = null;
        recordingChunksRef.current = [];
        releaseRecordingResources(stream);
      };
      recorder.onstop = () => {
        const mime = recorder.mimeType || "audio/webm";
        const extension = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
        const blob = new Blob(recordingChunksRef.current, { type: mime });
        const waveform = compressAudioWaveform(recordingWaveformSamplesRef.current);
        recordingWaveformSamplesRef.current = [];
        recordingChunksRef.current = [];
        mediaRecorderRef.current = null;
        releaseRecordingResources(stream);
        recordingStartedAtRef.current = null;
        if (blob.size > 0) {
          setRecordingFile(new globalThis.File([blob], "mensagem-de-voz." + extension, { type: mime }));
          setRecordingWaveform(waveform);
          setRecordingStatus("ready");
        } else {
          setRecordingStatus("idle");
          setError("A gravação ficou vazia. Tente novamente.");
        }
      };

      const AudioContextConstructor = window.AudioContext;
      if (AudioContextConstructor) {
        try {
          const audioContext = new AudioContextConstructor();
          const source = audioContext.createMediaStreamSource(stream);
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.72;
          source.connect(analyser);
          recordingAudioContextRef.current = audioContext;
          recordingAnalyserRef.current = analyser;
          await audioContext.resume().catch(() => undefined);
        } catch (cause) {
          console.warn("A visualização da forma de onda não está disponível neste dispositivo.", cause);
        }
      }

      recorder.start(200);
      recordingStartedAtRef.current = Date.now();
      setRecordingStatus("recording");
      setAttachmentOpen(false);

      startRecordingVisualizer();
    } catch (cause) {
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
      recordingAnalyserRef.current = null;
      stopRecordingVisualizer();
      const audioContext = recordingAudioContextRef.current;
      recordingAudioContextRef.current = null;
      if (audioContext && audioContext.state !== "closed") void audioContext.close();
      mediaRecorderRef.current = null;
      setRecordingStatus("idle");
      setError(cause instanceof Error ? cause.message : "Não foi possível acessar o microfone.");
    }
  }

  async function toggleRecordingPause() {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (recorder.state === "recording") {
      recorder.pause();
      const startedAt = recordingStartedAtRef.current;
      if (startedAt !== null) recordingAccumulatedMsRef.current += Date.now() - startedAt;
      recordingStartedAtRef.current = null;
      setRecordingElapsedMs(recordingAccumulatedMsRef.current);
      stopRecordingVisualizer();
      const audioContext = recordingAudioContextRef.current;
      if (audioContext && audioContext.state === "running") await audioContext.suspend().catch(() => undefined);
      setRecordingStatus("paused");
    } else if (recorder.state === "paused") {
      recorder.resume();
      recordingStartedAtRef.current = Date.now();
      const audioContext = recordingAudioContextRef.current;
      if (audioContext && audioContext.state === "suspended") await audioContext.resume().catch(() => undefined);
      setRecordingStatus("recording");
      startRecordingVisualizer();
    }
  }

  function stopAudioRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    const startedAt = recordingStartedAtRef.current;
    if (startedAt !== null) recordingAccumulatedMsRef.current += Date.now() - startedAt;
    recordingStartedAtRef.current = null;
    setRecordingElapsedMs(recordingAccumulatedMsRef.current);
    stopRecordingVisualizer();
    setRecordingStatus("finalizing");
    recorder.stop();
  }

  function discardRecordedAudio() {
    setRecordingFile(null);
    setRecordingWaveform([]);
    recordingWaveformSamplesRef.current = [];
    setRecordingStatus("idle");
    setRecordingElapsedMs(0);
    setRecordingLevels(Array.from({ length: 34 }, () => 0.08));
    recordingAccumulatedMsRef.current = 0;
    recordingStartedAtRef.current = null;
  }

  async function sendRecordedAudio() {
    if (!recordingFile || recordingStatus !== "ready" || busy) return;
    const sent = await sendFile(recordingFile, "audio", {
      waveform: recordingWaveform,
      waveformVersion: 1,
      durationSeconds: Math.max(0.1, Math.round(recordingElapsedMs / 10) / 100),
    });
    if (sent) discardRecordedAudio();
  }

  function clearMessageHold() {
    if (messageHoldTimerRef.current !== null) {
      window.clearTimeout(messageHoldTimerRef.current);
      messageHoldTimerRef.current = null;
    }
  }

  function startMessageHold(messageId: string) {
    clearMessageHold();
    messageHoldTimerRef.current = window.setTimeout(() => {
      setSelectedActionMessageId(messageId);
      messageHoldTimerRef.current = null;
      if (Capacitor.isNativePlatform()) {
        void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
      }
    }, 1000);
  }

  async function copyMessage(messageId: string, body: string) {
    setCopyError(null);
    setCopiedMessageId(null);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard_unavailable");
      await navigator.clipboard.writeText(body);
      setCopiedMessageId(messageId);
      setSelectedActionMessageId(null);
    } catch {
      setCopyError("Não foi possível copiar esta mensagem neste navegador.");
    }
  }

  function toggleFavoriteMessage(messageId: string) {
    setFavoriteMessageIds((current) =>
      current.includes(messageId)
        ? current.filter((id) => id !== messageId)
        : [...current, messageId],
    );
    setSelectedActionMessageId(null);
  }

  function beginEditMessage(message: CoupleMessage) {
    setEditingMessageId(message.id);
    setEditingDraft(message.body);
    setSelectedActionMessageId(null);
  }

  async function saveEditedMessage(messageId: string) {
    const body = editingDraft.trim();
    if (!body || body.length > 2000 || savingEdit) return;
    setSavingEdit(true);
    setError(null);
    try {
      const result = await updateCoupleMessage({ messageId, senderId: userId, body });
      if (result.error || !result.data) throw result.error ?? new Error("message_not_updated");
      const updated = normalizedMessage(result.data);
      setState((current) => current.status === "active"
        ? { ...current, messages: current.messages.map((message) => message.id === messageId ? updated : message) }
        : current);
      setEditingMessageId(null);
      setEditingDraft("");
    } catch (cause) {
      console.error("Falha ao editar mensagem.", cause);
      setError("Não foi possível editar. Confira a permissão de edição no banco de dados.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteMessage(message: CoupleMessage) {
    setSelectedActionMessageId(null);
    if (!window.confirm("Excluir esta mensagem? Essa ação não pode ser desfeita.")) return;
    setError(null);
    try {
      const result = await deleteCoupleMessage({ messageId: message.id, coupleId: message.couple_id });
      if (result.error || !result.data) throw result.error ?? new Error("message_not_deleted");
      setState((current) => current.status === "active"
        ? { ...current, messages: current.messages.filter((item) => item.id !== message.id) }
        : current);
      if (message.attachment_path) {
        await removeCoupleMedia(message.attachment_path).catch(() => undefined);
      }
      setMediaUrls((current) => {
        const next = { ...current };
        delete next[message.id];
        return next;
      });
      delete mediaUrlsCacheRef.current[message.id];
    } catch (cause) {
      console.error("Falha ao excluir mensagem.", cause);
      setError("Não foi possível excluir. Confira a permissão de exclusão no banco de dados.");
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    if (!busy && draft.trim()) composerRef.current?.requestSubmit();
  }

  function renderMessageContent(message: CoupleMessage, messageTime?: string) {
    const url = mediaUrls[message.id];
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
        <ConversationAudioPlayer src={url} waveform={readMessageAudioWaveform(message)} durationSeconds={readMessageAudioDuration(message)} messageTime={messageTime} />
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

  useEffect(() => {
    try {
      window.localStorage.setItem("morados-favorite-messages-" + userId, JSON.stringify(favoriteMessageIds));
    } catch {
      // Favoritos permanecem disponíveis durante a sessão mesmo sem armazenamento local.
    }
  }, [favoriteMessageIds, userId]);

  if (callKind && state.status === "active") {
    return (
      <ConversationCallScreen
        kind={callKind}
        name={state.otherName}
        avatarUrl={state.otherAvatarUrl}
        onClose={() => setCallKind(null)}
      />
    );
  }

  if (settingsPageOpen && state.status === "active") {
    return (
      <CoupleConversationSettings
        userId={userId}
        coupleId={state.coupleId}
        messages={state.messages}
        mediaUrls={mediaUrls}
        appearance={appearance}
        notifications={notifications}
        backgroundImageUrl={backgroundImageUrl}
        backgroundImageError={backgroundImageError}
        savingAppearance={appearanceSaving}
        savingNotifications={notificationsSaving}
        appearanceSyncAvailable={appearanceSyncAvailable}
        notificationsSyncAvailable={notificationsSyncAvailable}
        hasOlderMessages={hasOlderMessages}
        loadingOlderMessages={loadingOlderMessages}
        onBack={() => setSettingsPageOpen(false)}
        onAppearanceChange={updateAppearance}
        onNotificationsChange={updateNotifications}
        onLoadMore={() => void loadOlderMessages()}
        onSearchMessages={() => {
          setSettingsPageOpen(false);
          setSearchOpen(true);
        }}
        onNavigate={onNavigate}
      />
    );
  }

  const conversationStyle = {
    "--conversation-bubble-own": appearance.ownBubbleColor,
    "--conversation-bubble-other": appearance.otherBubbleColor,
    "--conversation-message-text": appearance.messageTextColor,
    "--conversation-own-ink": readableInk(appearance.ownBubbleColor, appearance.messageTextColor),
    "--conversation-other-ink": readableInk(appearance.otherBubbleColor, appearance.messageTextColor),
    "--conversation-message-radius": appearance.bubbleRadius + "px",
  } as CSSProperties;

  const wallpaperImageStyle = backgroundImageUrl && appearance.wallpaper === "photo"
    ? {
        backgroundImage: "url(" + JSON.stringify(backgroundImageUrl) + ")",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        opacity: appearance.backgroundOpacity / 100,
        filter: "brightness(" + appearance.backgroundBrightness + "%)",
      } as CSSProperties
    : undefined;

  return (
    <section
      className={"conversation-screen wallpaper-" + appearance.wallpaper + (appearance.wallpaper === "photo" ? " wallpaper-photo" : "")}
      style={conversationStyle}
      data-message-font={appearance.messageFont}
      aria-label="Conversa do casal"
    >
      {wallpaperImageStyle && (
        <div className="conversation-wallpaper-image" aria-hidden="true" style={wallpaperImageStyle} />
      )}
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
          <button
            type="button"
            className="conversation-call-button conversation-floating-action"
            aria-label="Chamada de voz"
            title="Chamada de voz"
            disabled={state.status !== "active"}
            onClick={() => setCallKind("audio")}
          >
            <Phone aria-hidden="true" />
          </button>
        </div>

        <div className="conversation-heading-trailing">
          <button
            type="button"
            className="conversation-call-button conversation-floating-action"
            aria-label="Chamada de vídeo"
            title="Chamada de vídeo"
            disabled={state.status !== "active"}
            onClick={() => setCallKind("video")}
          >
            <Video aria-hidden="true" />
          </button>
          <button
            type="button"
            className="conversation-options-button conversation-floating-action"
            aria-label="Configurações da conversa"
            disabled={state.status !== "active"}
            title="Configurações"
            onClick={openConversationSettings}
          >
            <MoreVertical aria-hidden="true" />
          </button>
        </div>
      </header>


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
                    <article
                      className={
                        "conversation-message" +
                        (ownMessage ? " is-own" : "") +
                        (previousMessage && !showDayDivider && previousMessage.sender_id === message.sender_id ? " is-grouped" : "") +
                        " is-kind-" + message.message_type +
                        (favoriteMessageIds.includes(message.id) ? " is-favorite" : "")
                      }
                      onPointerDown={(event) => {
                        if (event.pointerType === "mouse" && event.button !== 0) return;
                        startMessageHold(message.id);
                      }}
                      onPointerUp={clearMessageHold}
                      onPointerCancel={clearMessageHold}
                      onPointerLeave={clearMessageHold}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        clearMessageHold();
                        setSelectedActionMessageId(message.id);
                      }}
                    >
                      <span className="conversation-sender sr-only">{ownMessage ? "Você" : state.otherName}</span>
                      {favoriteMessageIds.includes(message.id) && (
                        <span className="conversation-message-favorite" aria-label="Mensagem favorita">
                          <Star aria-hidden="true" />
                        </span>
                      )}
                      {selectedActionMessageId === message.id && (
                        <div className={"conversation-message-actions" + (ownMessage ? " is-own" : "")} role="group" aria-label="Ações da mensagem" onPointerDown={(event) => event.stopPropagation()}>
                          {ownMessage && message.message_type === "text" && (
                            <button type="button" onClick={() => beginEditMessage(message)}><Pencil aria-hidden="true" /><span>Editar</span></button>
                          )}
                          <button type="button" className="is-danger" onClick={() => void deleteMessage(message)}><Trash2 aria-hidden="true" /><span>Excluir</span></button>
                          <button type="button" onClick={() => void copyMessage(message.id, message.body.trim() || message.attachment_name || ("Mensagem de " + message.message_type))}>
                            {copiedMessageId === message.id ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                            <span>{copiedMessageId === message.id ? "Copiada" : "Copiar"}</span>
                          </button>
                          <button type="button" onClick={() => toggleFavoriteMessage(message.id)}>
                            <Star aria-hidden="true" />
                            <span>{favoriteMessageIds.includes(message.id) ? "Desfavoritar" : "Favoritar"}</span>
                          </button>
                        </div>
                      )}
                      <div className={"conversation-message-content is-" + message.message_type}>
                        {editingMessageId === message.id ? (
                          <div className="conversation-inline-edit" onPointerDown={(event) => event.stopPropagation()}>
                            <textarea value={editingDraft} maxLength={2000} onChange={(event) => setEditingDraft(event.target.value)} aria-label="Editar mensagem" />
                            <div>
                              <button type="button" onClick={() => { setEditingMessageId(null); setEditingDraft(""); }}>Cancelar</button>
                              <button type="button" onClick={() => void saveEditedMessage(message.id)} disabled={!editingDraft.trim() || savingEdit}>
                                {savingEdit ? <LoaderCircle aria-hidden="true" /> : <Check aria-hidden="true" />}
                                Salvar
                              </button>
                            </div>
                          </div>
                        ) : message.message_type === "audio" ? (
                          renderMessageContent(message, formatMessageTime(message.created_at))
                        ) : (
                          <>
                            <time className="conversation-message-time" dateTime={message.created_at}>
                              {formatMessageTime(message.created_at)}
                            </time>
                            {renderMessageContent(message)}
                          </>
                        )}
                      </div>
                    </article>
                  </Fragment>
                );
              })
            )}
            <div className="conversation-scroll-end-spacer" aria-hidden="true" />
          </div>

          {copyError && <p className="conversation-error" role="alert">{copyError}</p>}
          {error && <p className="conversation-error" role="alert">{error}</p>}

          {attachmentOpen && (
            <div className="conversation-tools-panel">
              <div className="conversation-attachment-grid">
                <button type="button" onClick={() => openAttachmentPicker("image/*")}><Image aria-hidden="true" /><span>Galeria</span></button>
                <button type="button" onClick={() => { setAttachmentOpen(false); setCameraMode("photo"); }}><Camera aria-hidden="true" /><span>Tirar foto</span></button>
                <button type="button" onClick={() => openAttachmentPicker("video/*")}><Video aria-hidden="true" /><span>Vídeo</span></button>
                <button type="button" onClick={() => { setAttachmentOpen(false); setCameraMode("video"); }}><Video aria-hidden="true" /><span>Gravar vídeo</span></button>
                <button type="button" onClick={() => openAttachmentPicker("audio/*")}><Music2 aria-hidden="true" /><span>Enviar áudio</span></button>
                <button type="button" onClick={() => openAttachmentPicker("application/pdf,text/plain,application/zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}><File aria-hidden="true" /><span>Arquivos</span></button>
              </div>
            </div>
          )}

          <form ref={composerRef} className="conversation-composer" data-no-swipe onSubmit={handleSend}>
            <input
              ref={fileInputRef}
              type="file"
              accept={attachmentAccept}
              className="sr-only"
              onChange={(event) => void sendAttachment(event)}
              aria-label="Escolher arquivo para enviar"
            />
            <div className="conversation-composer-row">
              <div className="conversation-input-shell">
                {recordingStatus === "idle" ? (
                  <>
                    <button
                      type="button"
                      className={"conversation-attachment-button" + (attachmentOpen ? " is-active" : "")}
                      onClick={() => setAttachmentOpen((value) => !value)}
                      aria-label="Anexar mídia"
                      title="Foto, vídeo, áudio ou arquivo"
                      disabled={busy}
                    >
                      <Paperclip aria-hidden="true" />
                    </button>
                    {Capacitor.isNativePlatform() ? (
                      <button
                        type="button"
                        className="conversation-native-message-trigger conversation-message-input flex min-h-[38px] min-w-0 flex-1 items-center justify-center bg-transparent px-0 py-2 text-center text-sm text-muted-foreground disabled:cursor-wait disabled:opacity-60"
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
                          className="conversation-message-input"
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
                    <button
                      type="button"
                      className="conversation-audio-button"
                      onClick={() => void startAudioRecording()}
                      aria-label="Gravar áudio"
                      title="Gravar áudio"
                      disabled={busy || state.status !== "active"}
                    >
                      <Mic aria-hidden="true" />
                    </button>
                    {!Capacitor.isNativePlatform() && (
                      <button type="submit" className="conversation-send-button" disabled={busy || draft.trim().length === 0} aria-label="Enviar mensagem" title="Enviar">
                        {busy ? <LoaderCircle aria-hidden="true" /> : <Send aria-hidden="true" />}
                      </button>
                    )}
                  </>
                ) : recordingStatus === "ready" ? (
                  recordingFile && recordingPreviewUrl ? (
                    <div className="conversation-recording-review-inline">
                      <ConversationAudioPlayer src={recordingPreviewUrl} waveform={recordingWaveform} />
                      <div className="conversation-recording-review-actions">
                        <button type="button" className="conversation-recording-discard" onClick={discardRecordedAudio} disabled={busy} aria-label="Descartar áudio" title="Descartar">
                          <X aria-hidden="true" />
                        </button>
                        <button type="button" className="conversation-recording-send" onClick={() => void sendRecordedAudio()} disabled={busy} aria-label="Enviar áudio" title="Enviar áudio">
                          {busy ? <LoaderCircle aria-hidden="true" /> : <Send aria-hidden="true" />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span className="conversation-recording-wait" role="status" aria-label="Preparando áudio">
                      <LoaderCircle aria-hidden="true" />
                    </span>
                  )
                ) : (
                  <div className={"conversation-recording-inline is-" + recordingStatus}>
                    <div className="conversation-recording-clock">
                      <span className="conversation-recording-dot" />
                      <strong>{recordingStatus === "requesting" ? "Microfone" : recordingStatus === "finalizing" ? "Preparando" : formatAudioDuration(recordingElapsedMs)}</strong>
                    </div>
                    <div className="conversation-recording-waveform" role="img" aria-label={recordingStatus === "paused" ? "Gravação pausada" : "Visualização do áudio enquanto grava"}>
                      {recordingLevels.map((level, index) => (
                        <span key={index} style={{ height: Math.max(4, Math.round(level * 30)) + "px" }} />
                      ))}
                    </div>
                    <div className="conversation-recording-actions">
                      {recordingStatus === "requesting" || recordingStatus === "finalizing" ? (
                        <span className="conversation-recording-wait" role="status"><LoaderCircle aria-hidden="true" /></span>
                      ) : (
                        <>
                          <button type="button" className="conversation-recording-pause" onClick={() => void toggleRecordingPause()} aria-label={recordingStatus === "paused" ? "Retomar gravação" : "Pausar gravação"} title={recordingStatus === "paused" ? "Retomar" : "Pausar"}>
                            {recordingStatus === "paused" ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
                          </button>
                          <button type="button" className="conversation-recording-stop" onClick={stopAudioRecording} aria-label="Parar gravação" title="Parar gravação">
                            <Square aria-hidden="true" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {recordingStatus === "idle" && <p className="conversation-composer-hint">Enter envia · Shift + Enter quebra a linha</p>}
          </form>
        </>
      )}
      <MoradosCamera
        key={cameraMode ?? "closed"}
        open={cameraMode !== null}
        initialMode={cameraMode ?? "photo"}
        onClose={() => setCameraMode(null)}
        onCaptured={(file) => {
          setCameraMode(null);
          void sendFile(file);
        }}
      />
    </section>
  );
}
