import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type CSSProperties,
} from "react";
import {
  ArrowRight,
  AudioLines,
  Brain,
  Crown,
  Heart,
  ChevronDown,
  ChevronUp,
  Copy,
  Mic,
  Square,
  CalendarHeart,
  Camera,
  Gamepad2,
  GripVertical,
  ImagePlus,
  LoaderCircle,
  MessageCircle,
  MoreHorizontal,
  MoveDown,
  MoveUp,
  Music2,
  Plus,
  Send,
  Share2,
  Sparkles,
  RefreshCw,
  Video,
  Check,
  Ship,
  Target,
  Type,
  X,
} from "lucide-react";
import { CoupleSetup } from "@/components/CoupleSetup";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { createCoupleMediaUrl, removeCoupleMedia, uploadCoupleMedia } from "@/lib/couple-media";
import {
  createCouplePost,
  listCouplePosts,
  type CouplePost,
  type CouplePostBlock,
  type CouplePostBlockType,
} from "@/lib/couple-feed";
import { getMoradosMusicTrack, MORADOS_MUSIC_TRACKS, renderMoradosMusic } from "@/lib/morados-music-library";
import { openMoradosAppSettings } from "@/lib/device-settings";

type FeedBlockView = CouplePostBlock & { media_url: string | null };

type FeedPostView = CouplePost & {
  author_name: string;
  author_avatar_url: string | null;
  media_url: string | null;
  blocks: FeedBlockView[];
};

type PostDraftBlock = {
  id: string;
  type: CouplePostBlockType;
  value: string;
  caption: string;
  url: string;
  file: File | null;
  previewUrl: string | null;
  trackId: string | null;
};

type FeedState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "no-couple" }
  | { status: "ready"; coupleId: string; posts: FeedPostView[] };

type FeedFilter = "all" | "photos" | "videos" | "text" | "audio";

type CoupleFeedProps = {
  userId: string;
  onNavigate: (section: "games" | "memories") => void;
  onOpenConversation: () => void;
  postComposerRequest: number;
};

type AnniversaryMoment = {
  monthDay: string;
  targetDate: Date;
  posts: FeedPostView[];
};

const gameSuggestions = [
  {
    title: "Uma partida de Lig 4?",
    detail: "Uma disputa rápida, colorida e perfeita para um intervalo",
    label: "Estratégia",
    game: "Lig 4",
    icon: Target,
    accent: "coral",
  },
  {
    title: "Vamos jogar damas?",
    detail: "Preparem as peças e vejam quem pensa alguns lances à frente",
    label: "Clássico",
    game: "Damas",
    icon: Crown,
    accent: "green",
  },
  {
    title: "Um desafio de perguntas?",
    detail: "Descubram como cada um pensa e comparem as respostas",
    label: "Desafio",
    game: "Isto ou aquilo?",
    icon: Brain,
    accent: "violet",
  },
  {
    title: "Que tal uma batalha naval?",
    detail: "Escolham suas frotas e tentem descobrir onde o outro se escondeu",
    label: "Dedução",
    game: "Batalha naval",
    icon: Ship,
    accent: "gold",
  },
];

function formatFeedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMemoryDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
  }).format(value);
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("pt-BR") ?? "")
    .join("") || "M";
}

function findAnniversaryMoments(posts: FeedPostView[]): AnniversaryMoment[] {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const groups = new Map<string, FeedPostView[]>();

  for (const post of posts) {
    if (!post.media_url || !post.media_mime?.startsWith("image/")) continue;
    const created = new Date(post.created_at);
    if (Number.isNaN(created.getTime()) || created.getFullYear() >= now.getFullYear()) continue;
    const monthDay = String(created.getMonth() + 1).padStart(2, "0") + "-" +
      String(created.getDate()).padStart(2, "0");
    groups.set(monthDay, [...(groups.get(monthDay) ?? []), post]);
  }

  return [...groups.entries()]
    .map(([monthDay, groupPosts]) => {
      const parts = monthDay.split("-").map(Number);
      let targetDate = new Date(now.getFullYear(), parts[0] - 1, parts[1]);
      if (targetDate < start) {
        targetDate = new Date(now.getFullYear() + 1, parts[0] - 1, parts[1]);
      }
      const daysAway = Math.round(
        (targetDate.getTime() - start.getTime()) / 86400000,
      );
      return { monthDay, targetDate, posts: groupPosts, daysAway };
    })
    .filter((moment) => moment.daysAway <= 30)
    .sort((left, right) => left.daysAway - right.daysAway)
    .slice(0, 2)
    .map(({ monthDay, targetDate, posts: groupPosts }) => ({
      monthDay,
      targetDate,
      posts: groupPosts
        .slice()
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 4),
    }));
}

export function CoupleFeed({
  userId,
  onNavigate,
  onOpenConversation,
  postComposerRequest,
}: CoupleFeedProps) {
  const [state, setState] = useState<FeedState>({ status: "loading" });
  const [refreshKey, setRefreshKey] = useState(0);
  const [draftBlocks, setDraftBlocks] = useState<PostDraftBlock[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [postFilter, setPostFilter] = useState<FeedFilter>("all");
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [renderingMusicBlockId, setRenderingMusicBlockId] = useState<string | null>(null);
  const [musicPickerBlockId, setMusicPickerBlockId] = useState<string | null>(null);
  const [activeMusicPostId, setActiveMusicPostId] = useState<string | null>(null);
  const feedMusicRef = useRef<HTMLAudioElement>(null);
  const dragBlockRef = useRef<string | null>(null);

  useEffect(() => {
    if (postComposerRequest > 0) setComposerOpen(true);
  }, [postComposerRequest]);

  const createDraftBlock = (type: CouplePostBlockType): PostDraftBlock => ({
    id: typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2),
    type,
    value: "",
    caption: "",
    url: "",
    file: null,
    previewUrl: null,
    trackId: null,
  });

  function addDraftBlock(type: CouplePostBlockType) {
    if (draftBlocks.length >= 16) {
      setPublishError("Uma publicação pode ter até 16 partes.");
      return;
    }
    setPublishError(null);
    setDraftBlocks((current) => [...current, createDraftBlock(type)]);
  }

  function updateDraftBlock(id: string, patch: Partial<PostDraftBlock>) {
    setDraftBlocks((current) => current.map((block) => block.id === id ? { ...block, ...patch } : block));
  }

  function removeDraftBlock(id: string) {
    setDraftBlocks((current) => {
      const block = current.find((item) => item.id === id);
      if (block?.previewUrl) URL.revokeObjectURL(block.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }

  function moveDraftBlock(id: string, direction: -1 | 1) {
    setDraftBlocks((current) => {
      const from = current.findIndex((block) => block.id === id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function reorderDraftBlock(draggedId: string, targetId: string, insertAfter: boolean) {
    if (draggedId === targetId) return;
    setDraftBlocks((current) => {
      const from = current.findIndex((block) => block.id === draggedId);
      const targetIndex = current.findIndex((block) => block.id === targetId);
      if (from < 0 || targetIndex < 0) return current;
      const insertionIndex = targetIndex + (insertAfter ? 1 : 0);
      const destination = from < insertionIndex ? insertionIndex - 1 : insertionIndex;
      if (destination === from) return current;
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(destination, 0, item);
      return next;
    });
  }

  function handleBlockPointerDown(id: string, event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    dragBlockRef.current = id;
    setDraggedBlockId(id);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleBlockPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const draggedId = dragBlockRef.current;
    if (!draggedId) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-post-block-id]");
    const targetId = target?.getAttribute("data-post-block-id");
    if (!targetId || targetId === draggedId || !target) return;
    const bounds = target.getBoundingClientRect();
    reorderDraftBlock(draggedId, targetId, event.clientY > bounds.top + bounds.height / 2);
  }

  function handleBlockPointerEnd() {
    dragBlockRef.current = null;
    setDraggedBlockId(null);
  }

  function handleBlockFile(id: string, file: File | null) {
    setDraftBlocks((current) => current.map((block) => {
      if (block.id !== id) return block;
      if (block.previewUrl) URL.revokeObjectURL(block.previewUrl);
      return {
        ...block,
        file,
        previewUrl: file ? URL.createObjectURL(file) : null,
        value: file?.name ?? block.value,
      };
    }));
  }

  function resetComposer() {
    setDraftBlocks((current) => {
      current.forEach((block) => {
        if (block.previewUrl) URL.revokeObjectURL(block.previewUrl);
      });
      return [];
    });
    setPublishError(null);
  }

  const canPublishDraft = draftBlocks.some((block) => {
    if (block.type === "title" || block.type === "text") return Boolean(block.value.trim());
    if (block.type === "photo" || block.type === "video" || block.type === "audio") return Boolean(block.file);
    if (block.type === "music") return Boolean(block.trackId);
    return false;
  });

  const loadFeed = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const { data: membership, error: membershipError } = await supabase
        .from("couple_members")
        .select("couple_id")
        .eq("user_id", userId)
        .is("ended_at", null)
        .maybeSingle();

      if (membershipError) throw membershipError;
      if (!membership?.couple_id) {
        setState({ status: "no-couple" });
        return;
      }

      const { data: couple, error: coupleError } = await supabase
        .from("couples")
        .select("id, status")
        .eq("id", membership.couple_id)
        .maybeSingle();

      if (coupleError) throw coupleError;
      if (!couple || couple.status !== "active") {
        setState({ status: "no-couple" });
        return;
      }

      const result = await listCouplePosts(couple.id);
      if (result.error) throw result.error;
      const rows = result.data ?? [];
      const authorIds = [...new Set(rows.map((post) => post.author_id))];
      const profileMap = new Map<string, { name: string; avatarPath: string | null }>();

      if (authorIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_path")
          .in("id", authorIds);
        if (profilesError) throw profilesError;
        for (const profile of profiles ?? []) {
          profileMap.set(profile.id, { name: profile.display_name?.trim() || "", avatarPath: profile.avatar_path ?? null });
        }
      }

      const posts: FeedPostView[] = await Promise.all(rows.map(async (post) => {
        const savedBlocks = Array.isArray(post.content_blocks) ? post.content_blocks : [];
        const sourceBlocks: CouplePostBlock[] = savedBlocks.length > 0
          ? savedBlocks
          : [
              ...(post.title ? [{ id: "legacy-title", type: "title" as const, value: post.title }] : []),
              ...(post.body ? [{ id: "legacy-text", type: "text" as const, value: post.body }] : []),
              ...(post.media_path ? [{
                id: "legacy-media",
                type: post.media_mime?.startsWith("video/") ? "video" as const
                  : post.media_mime?.startsWith("audio/") ? "audio" as const
                  : "photo" as const,
                media_path: post.media_path,
                media_name: post.media_name,
                media_mime: post.media_mime,
              }] : []),
            ];

        const blocks: FeedBlockView[] = await Promise.all(sourceBlocks.map(async (block) => {
          if (!block.media_path) return { ...block, media_url: null };
          const signed = await createCoupleMediaUrl(block.media_path);
          return { ...block, media_url: signed.url };
        }));
        const primaryImage = blocks.find((block) => block.type === "photo" && block.media_url);
        const primaryMedia = blocks.find((block) => block.media_path && block.media_url);
        const legacySigned = post.media_path
          ? await createCoupleMediaUrl(post.media_path)
          : null;

        const authorProfile = profileMap.get(post.author_id);
        const authorAvatar = authorProfile?.avatarPath
          ? await createCoupleMediaUrl(authorProfile.avatarPath)
          : null;
        return {
          ...post,
          author_name:
            authorProfile?.name ||
            (post.author_id === userId ? "Você" : "Sua pessoa"),
          author_avatar_url: authorAvatar?.url ?? null,
          blocks,
          media_url: primaryImage?.media_url ?? primaryMedia?.media_url ?? legacySigned?.url ?? null,
        };
      }));

      setState({ status: "ready", coupleId: couple.id, posts });
    } catch (error) {
      console.error("Não foi possível carregar o feed do casal.", error);
      setState({ status: "error" });
    }
  }, [userId]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed, refreshKey]);

  useEffect(() => {
    if (state.status !== "ready") return;
    const coupleId = state.coupleId;
    const channel = supabase
      .channel("couple-feed:" + coupleId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "couple_posts",
          filter: "couple_id=eq." + coupleId,
        },
        () => setRefreshKey((current) => current + 1),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [state.status, state.status === "ready" ? state.coupleId : null]);

  const anniversaryMoments = useMemo(
    () => state.status === "ready" ? findAnniversaryMoments(state.posts) : [],
    [state],
  );

  const visiblePosts = useMemo(() => {
    if (state.status !== "ready") return [];
    return state.posts.filter((post) => {
      if (postFilter === "photos") return post.blocks.some((block) => block.type === "photo");
      if (postFilter === "videos") return post.blocks.some((block) => block.type === "video");
      if (postFilter === "text") return post.blocks.some((block) => block.type === "text" || block.type === "title");
      if (postFilter === "audio") return post.blocks.some((block) => block.type === "audio" || block.type === "music");
      return true;
    });
  }, [state, postFilter]);

  useEffect(() => {
    if (state.status !== "ready" || typeof IntersectionObserver === "undefined") {
      setActiveMusicPostId(null);
      return;
    }

    const cards = Array.from(
      document.querySelectorAll<HTMLElement>("[data-feed-post-id]"),
    );
    const ratios = new Map<HTMLElement, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(
            entry.target as HTMLElement,
            entry.isIntersecting ? entry.intersectionRatio : 0,
          );
        }

        const mostVisible = cards
          .filter((card) => card.dataset.hasMusic === "true")
          .map((card) => ({
            id: card.dataset.feedPostId ?? "",
            ratio: ratios.get(card) ?? 0,
          }))
          .filter((item) => item.id && item.ratio >= 0.18)
          .sort((left, right) => right.ratio - left.ratio)[0];

        setActiveMusicPostId(mostVisible?.id ?? null);
      },
      { threshold: [0, 0.12, 0.18, 0.3, 0.45, 0.6, 0.8, 1] },
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [state.status, visiblePosts]);

  const activeMusicBlock =
    state.status === "ready" && activeMusicPostId
      ? state.posts
          .find((post) => post.id === activeMusicPostId)
          ?.blocks.find((block) => block.type === "music" && block.media_url)
      : undefined;

  useEffect(() => {
    const audio = feedMusicRef.current;
    if (!audio) return;

    const source = activeMusicBlock?.media_url;
    if (!source) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      return;
    }

    audio.pause();
    audio.src = source;
    audio.loop = true;
    audio.preload = "auto";
    audio.load();

    let disposed = false;
    let retryInstalled = false;
    const retryPlayback = () => {
      if (disposed || retryInstalled) return;
      retryInstalled = true;
      document.removeEventListener("pointerdown", retryPlayback, true);
      document.removeEventListener("touchstart", retryPlayback, true);
      void audio.play().catch(() => undefined);
    };

    void audio.play().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        // Browsers may wait for the first user gesture before allowing audio.
        document.addEventListener("pointerdown", retryPlayback, true);
        document.addEventListener("touchstart", retryPlayback, true);
      }
    });

    return () => {
      disposed = true;
      document.removeEventListener("pointerdown", retryPlayback, true);
      document.removeEventListener("touchstart", retryPlayback, true);
      audio.pause();
      audio.currentTime = 0;
    };
  }, [activeMusicPostId, activeMusicBlock?.media_url]);

  async function publishPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status !== "ready" || publishing || !canPublishDraft) return;

    const title = draftBlocks.find((block) => block.type === "title")?.value.trim().slice(0, 180) || null;
    const textBlocks = draftBlocks
      .filter((block) => block.type === "text" && block.value.trim())
      .map((block) => block.value.trim());
    const body = textBlocks.join("\n\n");
    if (body.length > 5000) {
      setPublishError("O texto total da publicação deve ter até 5.000 caracteres.");
      return;
    }

    setPublishing(true);
    setPublishError(null);
    const uploadedPaths: string[] = [];

    try {
      const contentBlocks: CouplePostBlock[] = [];
      for (const block of draftBlocks) {
        if ((block.type === "title" || block.type === "text") && !block.value.trim()) continue;
        if (block.type === "music") {
          if (!block.trackId) continue;
          const track = getMoradosMusicTrack(block.trackId);
          if (!track) throw new Error("A música escolhida não está disponível.");
          const musicFile = block.file ?? await renderMoradosMusic(track.id);
          const upload = await uploadCoupleMedia({
            coupleId: state.coupleId,
            userId,
            scope: "feed",
            file: musicFile,
          });
          if (upload.error || !upload.path) throw upload.error ?? new Error("Não foi possível preparar a música.");
          uploadedPaths.push(upload.path);
          contentBlocks.push({
            id: block.id,
            type: "music",
            value: track.title,
            track_id: track.id,
            caption: block.caption.trim() || undefined,
            media_path: upload.path,
            media_name: musicFile.name,
            media_mime: musicFile.type,
          });
          continue;
        }

        if (block.type === "photo" || block.type === "video" || block.type === "audio") {
          if (!block.file) continue;
          const upload = await uploadCoupleMedia({
            coupleId: state.coupleId,
            userId,
            scope: "feed",
            file: block.file,
          });
          if (upload.error || !upload.path) throw upload.error ?? new Error("upload_failed");
          uploadedPaths.push(upload.path);
          contentBlocks.push({
            id: block.id,
            type: block.type,
            value: block.value,
            caption: block.caption.trim() || undefined,
            media_path: upload.path,
            media_name: block.file.name,
            media_mime: block.file.type,
          });
          continue;
        }

        contentBlocks.push({
          id: block.id,
          type: block.type,
          value: block.value.trim(),
        });
      }

      if (contentBlocks.length === 0) return;

      const primaryMedia = contentBlocks.find((block) => block.type === "photo" || block.type === "video")
        ?? contentBlocks.find((block) => block.type === "audio" || block.type === "music");
      const result = await createCouplePost({
        coupleId: state.coupleId,
        authorId: userId,
        title,
        body,
        contentBlocks,
        mediaPath: primaryMedia?.media_path ?? null,
        mediaName: primaryMedia?.media_name ?? null,
        mediaMime: primaryMedia?.media_mime ?? null,
      });
      if (result.error) throw result.error;

      resetComposer();
      setComposerOpen(false);
      setRefreshKey((current) => current + 1);
    } catch (error) {
      await Promise.all(uploadedPaths.map((uploadedPath) => removeCoupleMedia(uploadedPath)));
      console.error("Não foi possível publicar no feed.", error);
      setPublishError(
        error instanceof Error
          ? error.message
          : "Não foi possível publicar. Tente novamente.",
      );
    } finally {
      setPublishing(false);
    }
  }

  if (state.status === "loading") {
    return (
      <section className="social-feed" aria-busy="true">
        <div className="feed-loading"><LoaderCircle aria-hidden="true" /> Preparando as publicações…</div>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="social-feed">
        <div className="feed-empty-state">
          <Sparkles aria-hidden="true" />
          <h2>Não foi possível abrir o feed.</h2>
          <p>Confira a conexão e tente novamente.</p>
          <button type="button" className="primary-action" onClick={() => setRefreshKey((value) => value + 1)}>
            Tentar novamente
          </button>
        </div>
      </section>
    );
  }

  if (state.status === "no-couple") {
    return (
      <section className="social-feed">
        <div className="feed-empty-state">
          <div className="feed-empty-illustration"><Heart aria-hidden="true" /></div>
          <h2>O feed de vocês começa aqui.</h2>
          <p>Vincule a outra pessoa para criar um espaço compartilhado de publicações, fotos e lembranças.</p>
        </div>
        <CoupleSetup userId={userId} />
      </section>
    );
  }

  return (
    <section className="social-feed">
      <audio ref={feedMusicRef} className="feed-ambient-audio" aria-hidden="true" preload="none" loop />
      <div className="feed-filter-bar" role="group" aria-label="Filtrar publicações">
        {([
          ["all", "Tudo"],
          ["photos", "Fotos"],
          ["videos", "Vídeos"],
          ["text", "Textos"],
          ["audio", "Música e áudio"],
        ] as const).map(([filter, label]) => (
          <button
            key={filter}
            type="button"
            className={postFilter === filter ? "is-active" : ""}
            aria-pressed={postFilter === filter}
            onClick={() => setPostFilter(filter)}
          >
            {label}
          </button>
        ))}
      </div>

      <Dialog
        open={composerOpen}
        onOpenChange={(open) => {
          setComposerOpen(open);
          if (!open && !publishing) resetComposer();
        }}
      >
        <DialogContent className="feed-publisher-dialog">
          <DialogHeader className="feed-publisher-header">
            <DialogTitle>Monte sua publicação</DialogTitle>
            <DialogDescription>Adicione partes ao card e arraste-as para escolher a ordem.</DialogDescription>
          </DialogHeader>

          <div className="feed-block-toolbox" role="toolbar" aria-label="Adicionar partes à publicação">
            <button type="button" onClick={() => addDraftBlock("photo")}><ImagePlus aria-hidden="true" /> Foto</button>
            <button type="button" onClick={() => addDraftBlock("title")}><Type aria-hidden="true" /> Título</button>
            <button type="button" onClick={() => addDraftBlock("text")}><span className="toolbox-text-icon">T</span> Texto</button>
            <button type="button" onClick={() => addDraftBlock("music")}><Music2 aria-hidden="true" /> Música</button>
            <button type="button" onClick={() => addDraftBlock("audio")}><AudioLines aria-hidden="true" /> Áudio</button>
            <button type="button" onClick={() => addDraftBlock("video")}><Camera aria-hidden="true" /> Vídeo</button>
          </div>

          <form className="feed-publisher-form" onSubmit={publishPost}>
            <article className="feed-post-card is-composer-card">
              <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <span className="feed-author-avatar is-you">{initials("Você")}</span>
                <div>
                  <strong>Você</strong>
                  <time>Agora · rascunho</time>
                </div>
                <span className="feed-post-private">Só vocês dois</span>
              </header>

              {draftBlocks.length === 0 ? (
                <button
                  type="button"
                  className="feed-composer-empty"
                  onClick={() => addDraftBlock("text")}
                >
                  <span className="feed-composer-empty-symbol"><Plus aria-hidden="true" /></span>
                  <strong>Este card ainda está vazio</strong>
                  <span>Adicione foto, título, texto, música ou áudio. Depois, arraste cada parte para organizar a publicação.</span>
                </button>
              ) : (
                <div className="feed-composer-blocks">
                  {draftBlocks.map((block, index) => (
                    <article
                      key={block.id}
                      data-post-block-id={block.id}
                      className={"feed-composer-block" + (draggedBlockId === block.id ? " is-dragging" : "")}
                    >
                      <div className="feed-composer-block-toolbar">
                        <button
                          type="button"
                          className="feed-block-drag-handle"
                          aria-label={"Arrastar bloco " + (index + 1)}
                          title="Arraste para reorganizar"
                          onPointerDown={(event) => handleBlockPointerDown(block.id, event)}
                          onPointerMove={handleBlockPointerMove}
                          onPointerUp={handleBlockPointerEnd}
                          onPointerCancel={handleBlockPointerEnd}
                        >
                          <GripVertical aria-hidden="true" />
                        </button>
                        <span className="feed-composer-block-type">
                          {block.type === "photo" ? "Foto" :
                           block.type === "video" ? "Vídeo" :
                           block.type === "title" ? "Título" :
                           block.type === "text" ? "Texto" :
                           block.type === "music" ? "Música" : "Áudio"}
                        </span>
                        <div className="feed-composer-block-actions">
                          <button type="button" onClick={() => moveDraftBlock(block.id, -1)} disabled={index === 0} aria-label="Mover para cima"><MoveUp aria-hidden="true" /></button>
                          <button type="button" onClick={() => moveDraftBlock(block.id, 1)} disabled={index === draftBlocks.length - 1} aria-label="Mover para baixo"><MoveDown aria-hidden="true" /></button>
                          <button type="button" onClick={() => removeDraftBlock(block.id)} aria-label="Remover parte"><X aria-hidden="true" /></button>
                        </div>
                      </div>

                      {block.type === "title" && (
                        <input
                          className="feed-composer-title-input"
                          value={block.value}
                          onChange={(event) => updateDraftBlock(block.id, { value: event.target.value })}
                          placeholder="Escreva o título da publicação"
                          aria-label="Título da publicação"
                          maxLength={180}
                        />
                      )}

                      {block.type === "text" && (
                        <textarea
                          className="feed-composer-text-input"
                          value={block.value}
                          onChange={(event) => updateDraftBlock(block.id, { value: event.target.value })}
                          placeholder="Escreva alguma coisa..."
                          aria-label="Texto da publicação"
                          rows={3}
                          maxLength={5000}
                        />
                      )}

                      {block.type === "photo" && (
                        <div className="feed-composer-media-block">
                          <InAppMediaCapture
                            kind="photo"
                            onCaptured={(file) => handleBlockFile(block.id, file)}
                          />
                          {block.previewUrl ? (
                            <img src={block.previewUrl} alt="Prévia da foto" />
                          ) : (
                            <label className="feed-composer-file-pick">
                              <ImagePlus aria-hidden="true" />
                              <span>Escolher da galeria</span>
                              <input type="file" accept="image/*" onChange={(event) => handleBlockFile(block.id, event.target.files?.[0] ?? null)} />
                            </label>
                          )}
                          {block.previewUrl && (
                            <label className="feed-composer-replace-file">
                              Substituir pela galeria
                              <input type="file" accept="image/*" onChange={(event) => handleBlockFile(block.id, event.target.files?.[0] ?? null)} />
                            </label>
                          )}
                          <input
                            className="feed-composer-caption"
                            value={block.caption}
                            onChange={(event) => updateDraftBlock(block.id, { caption: event.target.value })}
                            placeholder="Legenda da foto (opcional)"
                            aria-label="Legenda da foto"
                          />
                        </div>
                      )}

                      {block.type === "video" && (
                        <div className="feed-composer-media-block">
                          <InAppMediaCapture
                            kind="video"
                            onCaptured={(file) => handleBlockFile(block.id, file)}
                          />
                          {block.previewUrl ? (
                            <video src={block.previewUrl} controls playsInline />
                          ) : (
                            <label className="feed-composer-file-pick">
                              <ImagePlus aria-hidden="true" />
                              <span>Escolher vídeo da galeria</span>
                              <input type="file" accept="video/*" onChange={(event) => handleBlockFile(block.id, event.target.files?.[0] ?? null)} />
                            </label>
                          )}
                          <input
                            className="feed-composer-caption"
                            value={block.caption}
                            onChange={(event) => updateDraftBlock(block.id, { caption: event.target.value })}
                            placeholder="Legenda do vídeo (opcional)"
                            aria-label="Legenda do vídeo"
                          />
                        </div>
                      )}

                      {block.type === "music" && (
                        <div className="feed-composer-music-block">
                          <Music2 aria-hidden="true" />
                          <label className="feed-composer-track-label">
                            Trilha original do Morados
                            <div className="feed-track-picker">
                              <button
                                type="button"
                                className="feed-track-picker-trigger"
                                aria-expanded={musicPickerBlockId === block.id}
                                aria-haspopup="listbox"
                                onClick={() => setMusicPickerBlockId((current) => current === block.id ? null : block.id)}
                              >
                                <span>{getMoradosMusicTrack(block.trackId)?.title ?? "Escolher uma música"}</span>
                                <ChevronDown aria-hidden="true" />
                              </button>
                              {musicPickerBlockId === block.id && (
                                <div className="feed-track-picker-options" role="listbox" aria-label="Biblioteca de músicas Morados">
                                  {MORADOS_MUSIC_TRACKS.map((track) => (
                                    <button
                                      key={track.id}
                                      type="button"
                                      role="option"
                                      aria-selected={block.trackId === track.id}
                                      className={block.trackId === track.id ? "is-selected" : ""}
                                      onClick={() => {
                                        if (block.previewUrl) URL.revokeObjectURL(block.previewUrl);
                                        updateDraftBlock(block.id, {
                                          trackId: track.id,
                                          value: track.title,
                                          file: null,
                                          previewUrl: null,
                                          url: "",
                                        });
                                        setMusicPickerBlockId(null);
                                      }}
                                    >
                                      <span className="feed-track-picker-art" style={{ backgroundColor: track.color }}>
                                        <Music2 aria-hidden="true" />
                                      </span>
                                      <span className="feed-track-picker-copy">
                                        <strong>{track.title}</strong>
                                        <small>{track.mood}</small>
                                      </span>
                                      {block.trackId === track.id && <Check aria-hidden="true" />}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </label>
                          <button
                            type="button"
                            className="feed-composer-generate-music"
                            disabled={!block.trackId || renderingMusicBlockId === block.id}
                            onClick={async () => {
                              if (!block.trackId) return;
                              setRenderingMusicBlockId(block.id);
                              setPublishError(null);
                              try {
                                const file = await renderMoradosMusic(block.trackId);
                                handleBlockFile(block.id, file);
                              } catch (error) {
                                setPublishError(error instanceof Error ? error.message : "Não foi possível gerar a música.");
                              } finally {
                                setRenderingMusicBlockId(null);
                              }
                            }}
                          >
                            {renderingMusicBlockId === block.id ? <LoaderCircle aria-hidden="true" /> : <AudioLines aria-hidden="true" />}
                            {renderingMusicBlockId === block.id ? "Produzindo faixa…" : block.previewUrl ? "Gerar prévia novamente" : "Produzir e ouvir prévia"}
                          </button>
                          {block.previewUrl && <audio className="feed-composer-audio-preview" controls src={block.previewUrl} />}
                          <input
                            className="feed-composer-caption"
                            value={block.caption}
                            onChange={(event) => updateDraftBlock(block.id, { caption: event.target.value })}
                            placeholder="Uma dedicatória para acompanhar a música (opcional)"
                            aria-label="Dedicatória da música"
                          />
                        </div>
                      )}

                      {block.type === "audio" && (
                        <div className="feed-composer-audio-block">
                          {block.previewUrl && <audio controls src={block.previewUrl} />}
                          <label className="feed-composer-file-pick">
                            <AudioLines aria-hidden="true" />
                            <span>{block.file ? "Trocar arquivo de áudio" : "Enviar arquivo de áudio"}</span>
                            <input type="file" accept="audio/mpeg,audio/mp4,audio/aac,audio/ogg,audio/wav,audio/webm" onChange={(event) => handleBlockFile(block.id, event.target.files?.[0] ?? null)} />
                          </label>
                          <AudioRecorderControls onRecorded={(file) => handleBlockFile(block.id, file)} />
                          <input
                            className="feed-composer-caption"
                            value={block.caption}
                            onChange={(event) => updateDraftBlock(block.id, { caption: event.target.value })}
                            placeholder="Descrição do áudio (opcional)"
                            aria-label="Descrição do áudio"
                          />
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}

              <div className="feed-composer-add-another">
                <span>Adicionar outra parte</span>
                <div>
                  <button type="button" onClick={() => addDraftBlock("text")}><Plus aria-hidden="true" /> Texto</button>
                  <button type="button" onClick={() => addDraftBlock("photo")}><Plus aria-hidden="true" /> Foto</button>
                  <button type="button" onClick={() => addDraftBlock("music")}><Plus aria-hidden="true" /> Música</button>
                </div>
              </div>

              <footer className="feed-composer-footer">
                <span className="feed-composer-private"><span /> Só vocês dois</span>
                <button type="submit" className="feed-publish-button" disabled={publishing || !canPublishDraft}>
                  {publishing ? <LoaderCircle aria-hidden="true" /> : <Send aria-hidden="true" />}
                  Publicar
                </button>
              </footer>
              {publishError && <p className="feed-publish-error" role="alert">{publishError}</p>}
            </article>
          </form>
        </DialogContent>
      </Dialog>

      <div className="social-feed-list">
        {state.posts.length === 0 ? (
          <div className="feed-empty-state">
            <div className="feed-empty-illustration"><Images aria-hidden="true" /></div>
            <h2>Uma história ainda em branco.</h2>
            <p>Publique a primeira foto ou um pequeno momento para começar a preencher o feed.</p>
          </div>
        ) : visiblePosts.length === 0 ? (
          <div className="feed-empty-state feed-filter-empty">
            <h2>Nenhuma publicação neste filtro.</h2>
            <button type="button" className="secondary-action" onClick={() => setPostFilter("all")}>Mostrar tudo</button>
          </div>
        ) : (
          <>
            {visiblePosts.map((post, index) => {
              const game = gameSuggestions[index % gameSuggestions.length];
              const showGameCard = postFilter === "all" && (index === 1 || (index > 1 && index % 4 === 1));
              const showMemoryCards = postFilter === "all" && index === 0 && anniversaryMoments.length > 0;
              const GameIcon = game.icon;
              const postMusic = post.blocks.find(
                (block) => block.type === "music" && Boolean(block.media_url),
              );

              return (
                <div className="feed-sequence" key={post.id}>
                  <MoradosPostCardFrame
                    tone={getPostToneForId(post.id)}
                    postId={post.id}
                    hasMusic={post.blocks.some((block) => block.type === "music" && Boolean(block.media_url))}
                    footer={
                      <div className="feed-post-footer mt-4 flex flex-nowrap items-start justify-evenly border-t border-border/50 pt-3">
                        <div className="flex w-16 shrink-0 flex-col items-center gap-0.5">
                          <button type="button" onClick={onOpenConversation} aria-label="Conversa" className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground">
                            <MessageCircle className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <span className="whitespace-nowrap text-[10px] leading-none text-muted-foreground">Conversa</span>
                        </div>
                        <div className="flex w-16 shrink-0 flex-col items-center gap-0.5">
                          <button type="button" aria-label="Copiar texto" onClick={() => {
                            const copy = [post.title, ...post.blocks.map((block) => block.value || block.caption).filter(Boolean)].join("\\n\\n");
                            void navigator.clipboard?.writeText(copy);
                          }} className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground">
                            <Share2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <span className="whitespace-nowrap text-[10px] leading-none text-muted-foreground">Copiar texto</span>
                        </div>
                      </div>
                    }
                  >
                    <header className="feed-post-header mb-4 flex flex-wrap items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={"feed-author-avatar grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-sm font-bold text-primary " + (post.author_id === userId ? "is-you" : "")}>
                          {post.author_avatar_url ? (
                            <img src={post.author_avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                          ) : initials(post.author_name)}
                        </span>
                        <div className="feed-post-author-meta min-w-0">
                          <div className="flex items-center gap-1.5">
                            <strong className="truncate text-sm font-semibold text-foreground">{post.author_name}</strong>
                          </div>
                          <p className="feed-post-meta-line flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                            <time dateTime={post.created_at}>{formatFeedDate(post.created_at)}</time>
                            {postMusic && (
                              <span className="feed-post-music-meta" title={postMusic.value || "Trilha desta publicação"}>
                                <Music2 aria-hidden="true" />
                                <span>{postMusic.value || "Música"}</span>
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="ml-auto flex shrink-0 items-center gap-1.5">
                        <span className="feed-post-private">A dois</span>
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="feed-post-more" aria-label="Mais opções da publicação">
                            <MoreHorizontal aria-hidden="true" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="nc-menu">
                          <DropdownMenuItem
                            className="nc-menu-item"
                            onSelect={() => {
                              const copy = [post.title, ...post.blocks.map((block) => block.value || block.caption).filter(Boolean)].join("\\n\\n");
                              void navigator.clipboard?.writeText(copy);
                            }}
                          >
                            <Copy aria-hidden="true" /> Copiar texto
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="nc-menu-sep" />
                          <DropdownMenuItem className="nc-menu-item" onSelect={onOpenConversation}>
                            <MessageCircle aria-hidden="true" /> Abrir conversa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </header>

                    <div className="feed-post-content px-0">
                      {post.blocks.map((block) => (
                        <div className={"feed-post-block feed-post-block-" + block.type} key={block.id}>
                          {block.type === "title" && block.value && (
                            <h3 className="feed-post-title mb-2 text-base font-bold font-display leading-snug text-left text-foreground sm:text-lg">{block.value}</h3>
                          )}
                          {block.type === "text" && block.value && (
                            <p className="mb-4 whitespace-pre-line text-left text-sm leading-relaxed text-foreground/90">{block.value}</p>
                          )}
                          {block.type === "photo" && block.media_url && (
                            <FeedPostPhoto
                              src={block.media_url}
                              alt={block.caption || block.media_name || "Foto compartilhada"}
                              caption={block.caption}
                            />
                          )}
                          {block.type === "video" && block.media_url && (
                            <figure className="feed-post-media">
                              <video className="feed-post-video" src={block.media_url} controls playsInline preload="metadata" />
                              {block.caption && <figcaption>{block.caption}</figcaption>}
                            </figure>
                          )}
                          {block.type === "audio" && block.media_url && (
                            <div className="feed-post-audio">
                              <span className="feed-post-audio-icon"><AudioLines aria-hidden="true" /></span>
                              <div>
                                {block.caption && <strong>{block.caption}</strong>}
                                <audio src={block.media_url} controls preload="metadata" />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                  </MoradosPostCardFrame>

                  {showMemoryCards && anniversaryMoments.map((moment) => (
                    <AnniversaryCard key={moment.monthDay} moment={moment} />
                  ))}

                  {showGameCard && (
                    <article className={"feed-game-card is-" + game.accent}>
                      <div className="feed-game-art" aria-hidden="true"><GameIcon /></div>
                      <div className="feed-game-copy">
                        <span className="feed-game-kicker"><Gamepad2 aria-hidden="true" /> Sugestão para vocês · {game.label}</span>
                        <h2>{game.title}</h2>
                        <p>{game.detail}</p>
                        <button type="button" onClick={() => onNavigate("games")}>
                          Jogar juntos <ArrowRight aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  )}
                </div>
              );
            })}
            {postFilter === "all" && anniversaryMoments.length > 0 && state.posts.length > 1 && (
              <div className="feed-anniversary-more">
                {anniversaryMoments.map((moment) => (
                  <AnniversaryCard key={"later-" + moment.monthDay} moment={moment} compact />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function InAppMediaCapture({
  kind,
  onCaptured,
}: {
  kind: "photo" | "video";
  onCaptured: (file: File) => void;
}) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [opening, setOpening] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const keepRecordingRef = useRef(false);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play().catch(() => {
      setCameraError("Não foi possível iniciar a prévia da câmera.");
    });
  }, [cameraOpen]);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => {
      setSeconds((current) => {
        if (current + 1 >= 120) {
          recorderRef.current?.stop();
          return 120;
        }
        return current + 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => () => {
    keepRecordingRef.current = false;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    stopStream();
  }, []);

  async function startCamera(nextFacing: "environment" | "user" = facingMode) {
    setCameraError(null);
    setOpening(true);
    stopStream();
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("A câmera não está disponível neste navegador ou nesta origem.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: nextFacing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: kind === "video" ? { echoCancellation: true, noiseSuppression: true } : false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch (cause) {
      const name = cause instanceof DOMException ? cause.name : "";
      setCameraError(
        name === "NotAllowedError" || name === "PermissionDeniedError"
          ? kind === "video"
            ? "O Android precisa liberar a câmera e o microfone para gravar. Permita quando o pedido aparecer."
            : "Permita o acesso à câmera quando o Android solicitar."
          : name === "NotFoundError"
            ? "Não encontramos uma câmera compatível neste dispositivo."
            : name === "NotReadableError"
              ? "A câmera está sendo usada por outro aplicativo. Feche-o e tente novamente."
              : cause instanceof Error
                ? cause.message
                : "Não foi possível abrir a câmera do Morados.",
      );
    } finally {
      setOpening(false);
    }
  }

  function closeCamera() {
    keepRecordingRef.current = false;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    stopStream();
    setCameraOpen(false);
    setRecording(false);
    setSeconds(0);
  }

  async function flipCamera() {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    await startCamera(next);
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError("A câmera ainda está preparando a imagem. Tente novamente.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("Não foi possível preparar a foto.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError("Não foi possível gerar o arquivo da foto.");
        return;
      }
      const file = new File([blob], `morados-foto-${Date.now()}.jpg`, { type: "image/jpeg" });
      if (file.size > 35 * 1024 * 1024) {
        setCameraError("A foto ficou maior que o limite de 35 MB.");
        return;
      }
      onCaptured(file);
      closeCamera();
    }, "image/jpeg", 0.92);
  }

  function startVideoRecording() {
    const stream = streamRef.current;
    if (!stream || typeof MediaRecorder === "undefined") {
      setCameraError("A gravação de vídeo não é suportada neste dispositivo.");
      return;
    }
    try {
      chunksRef.current = [];
      keepRecordingRef.current = true;
      const mimeType = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        keepRecordingRef.current = false;
        setCameraError("A gravação foi interrompida. Tente novamente.");
        setRecording(false);
        stopStream();
      };
      recorder.onstop = () => {
        const shouldSave = keepRecordingRef.current;
        keepRecordingRef.current = false;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        if (shouldSave && blob.size > 0) {
          if (blob.size > 35 * 1024 * 1024) {
            setCameraError("O vídeo ultrapassou o limite de 35 MB. Grave um trecho menor.");
          } else {
            const mime = (blob.type || "video/webm").split(";")[0];
            const extension = mime.includes("mp4") ? "mp4" : "webm";
            onCaptured(new File([blob], `morados-video-${Date.now()}.${extension}`, { type: mime }));
            setCameraOpen(false);
          }
        } else if (shouldSave) {
          setCameraError("Nenhum vídeo foi capturado. Tente novamente.");
        }
        stopStream();
        setRecording(false);
        setSeconds(0);
      };
      recorder.start(500);
      setRecording(true);
      setCameraError(null);
    } catch (cause) {
      keepRecordingRef.current = false;
      setCameraError(cause instanceof Error ? cause.message : "Não foi possível iniciar o vídeo.");
    }
  }

  function stopVideoRecording() {
    keepRecordingRef.current = true;
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }

  async function openPermissionSettings() {
    try {
      const opened = await openMoradosAppSettings();
      if (!opened) {
        setCameraError("No navegador, permita câmera e microfone nas permissões do site e tente novamente.");
      }
    } catch {
      setCameraError("Abra as configurações do Android, entre em Aplicativos, Morados e Permissões.");
    }
  }

  return (
    <div className="morados-media-capture">
      {!cameraOpen && (
        <button
          type="button"
          className="morados-media-capture-trigger"
          onClick={() => void startCamera()}
          disabled={opening}
        >
          {opening ? <LoaderCircle aria-hidden="true" /> : kind === "photo" ? <Camera aria-hidden="true" /> : <Video aria-hidden="true" />}
          {opening
            ? "Abrindo câmera…"
            : kind === "photo"
              ? "Tirar foto no Morados"
              : "Gravar vídeo no Morados"}
        </button>
      )}

      {cameraOpen && (
        <div className="morados-camera-panel" role="region" aria-label={kind === "photo" ? "Câmera do Morados" : "Gravação de vídeo do Morados"}>
          <div className="morados-camera-panel-head">
            <strong>{kind === "photo" ? "Câmera do Morados" : "Gravador de vídeo"}</strong>
            <button type="button" onClick={closeCamera} aria-label="Fechar câmera">
              <X aria-hidden="true" />
            </button>
          </div>
          <video ref={videoRef} className="morados-camera-preview" autoPlay muted playsInline />
          <div className="morados-camera-actions">
            <button type="button" className="morados-camera-secondary" onClick={() => void flipCamera()} disabled={recording}>
              <RefreshCw aria-hidden="true" /> Virar câmera
            </button>
            {kind === "photo" ? (
              <button type="button" className="morados-camera-primary" onClick={capturePhoto}>
                <Camera aria-hidden="true" /> Capturar foto
              </button>
            ) : recording ? (
              <button type="button" className="morados-camera-primary is-recording" onClick={stopVideoRecording}>
                <Square aria-hidden="true" /> Parar e usar · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
              </button>
            ) : (
              <button type="button" className="morados-camera-primary" onClick={startVideoRecording}>
                <Video aria-hidden="true" /> Começar a gravar
              </button>
            )}
          </div>
          <p className="morados-camera-hint">
            {kind === "photo" ? "A imagem é capturada aqui, sem abrir outro aplicativo." : "Gravação de até 2 minutos, salva diretamente no rascunho da publicação."}
          </p>
        </div>
      )}

      {cameraError && (
        <div className="morados-capture-error" role="alert">
          <span>{cameraError}</span>
          <button type="button" onClick={() => void openPermissionSettings()}>
            Permissões do aplicativo
          </button>
        </div>
      )}
    </div>
  );
}

function FeedPostPhoto({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <figure className="feed-post-media feed-post-media-photo">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={"Ampliar imagem: " + alt}
          className="post-image feed-post-photo-trigger mx-auto my-4 block w-full cursor-zoom-in overflow-hidden rounded-2xl p-0 shadow-sm"
        >
          <img
            src={src}
            alt={alt}
            className="feed-post-image block h-auto w-full rounded-[inherit]"
            loading="lazy"
          />
        </button>
        {caption && <figcaption>{caption}</figcaption>}
      </figure>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="feed-post-image-dialog">
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <DialogDescription className="sr-only">Imagem ampliada da publicação.</DialogDescription>
          <img src={src} alt={alt} className="feed-post-image-expanded" />
        </DialogContent>
      </Dialog>
    </>
  );
}

const POST_TYPE_COLORS = {
  red: "#C6283B",
  blue: "#155ADB",
  green: "#237A43",
  orange: "#C54B1C",
  teal: "#087985",
  plum: "#663A92",
  rose: "#A72F69",
  amber: "#865A00",
} as const;

type PostTone = keyof typeof POST_TYPE_COLORS;

function getPostToneForId(postId: string): PostTone {
  // O ID UUID criado pelo banco dá a cada publicação uma cor estável e pseudoaleatória.
  let hash = 2166136261;
  for (let index = 0; index < postId.length; index += 1) {
    hash ^= postId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const tones = Object.keys(POST_TYPE_COLORS) as PostTone[];
  return tones[(hash >>> 0) % tones.length];
}

function useMoradosPostTypeStyle(tone: PostTone) {
  const color = POST_TYPE_COLORS[tone];
  return {
    ["--pt" as string]: color,
    ["--post-fade" as string]: color,
    ["--morados-post-bg" as string]: color,
    ["--morados-post-ink" as string]: "#fffaf1",
    borderColor: color,
    borderWidth: 1,
    backgroundColor: color,
    color: "#fffaf1",
    boxShadow: `0 9px 28px -17px color-mix(in srgb, ${color} 70%, transparent)`,
  } as CSSProperties;
}

/** Copiado do PostCardFrame do NutriConnect, com seletores do cabeçalho do Morados. */
function MoradosPostCardFrame({
  tone,
  postId,
  hasMusic,
  children,
  footer,
}: {
  tone: PostTone;
  postId: string;
  hasMusic: boolean;
  children: ReactNode;
  footer: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const [maxHeight, setMaxHeight] = useState<number | null>(null);
  const articleRef = useRef<HTMLElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const article = articleRef.current;
    const region = regionRef.current;
    const inner = innerRef.current;
    if (!article || !region || !inner) return;

    const observed = new Set<Element>();
    const observer = new ResizeObserver(() => measure());
    const watch = (element: Element | null) => {
      if (element && !observed.has(element)) {
        observed.add(element);
        observer.observe(element);
      }
    };
    const measure = () => {
      // A altura máxima depende apenas da largura, nunca da visibilidade das barras
      // nem da altura dinâmica da viewport ao rolar no Android.
      const compact = window.matchMedia("(max-width: 680px)").matches;
      const limit = compact ? 680 : 820;
      const chrome = article.offsetHeight - region.offsetHeight - (toggleRef.current?.offsetHeight ?? 0);
      setMaxHeight(limit);
      setOverflowing(inner.offsetHeight + chrome > limit + 1);
    };
    watch(inner);
    watch(article);
    measure();
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const clamped = !expanded && overflowing;
  const typeStyle = useMoradosPostTypeStyle(tone);
  return (
    <article
      ref={articleRef}
      data-post-tone={tone}
      data-post-type={tone}
      data-feed-post-id={postId}
      data-has-music={hasMusic ? "true" : "false"}
      style={{ ...typeStyle, ...(expanded ? {} : { maxHeight: maxHeight ?? "calc(100dvh - 8rem)" }) }}
      className="post-card feed-post-card flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:shadow-md"
    >
      <div ref={regionRef} className="feed-post-frame-region relative min-h-0 overflow-hidden px-[var(--post-px)] pt-[var(--post-pt)]">
        <div ref={innerRef} className="flow-root">{children}</div>
        {clamped && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
            style={{ background: "linear-gradient(to top, var(--post-fade, var(--card)), transparent)" }} />
        )}
      </div>
      {overflowing && (
        <div ref={toggleRef} className="shrink-0 px-[var(--post-px)] pt-3">
          <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}
            className="flex cursor-pointer items-center gap-1 text-xs font-bold text-accent hover:underline">
            {expanded ? "Ver menos" : "Ver mais"}
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
      <div className="shrink-0 px-[var(--post-px)] pb-[var(--post-pb)]">{footer}</div>
    </article>
  );
}

function AudioRecorderControls({ onRecorded }: { onRecorded: (file: File) => void }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [recordError, setRecordError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => {
      setSeconds((current) => {
        if (current + 1 >= 180) {
          recorderRef.current?.stop();
          return 180;
        }
        return current + 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  };

  async function startRecording() {
    setRecordError(null);
    setSeconds(0);
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("A gravação pelo microfone não está disponível neste navegador.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = [
        "audio/webm",
        "audio/mp4",
        "audio/webm;codecs=opus",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setRecordError("A gravação foi interrompida. Tente novamente.");
        setRecording(false);
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const normalizedMime = (blob.type || "audio/webm").split(";")[0].trim();
        const extension = normalizedMime.includes("mp4") ? "m4a" : normalizedMime.includes("ogg") ? "ogg" : "webm";
        if (blob.size > 0) {
          const file = new File([blob], `morados-gravacao-${Date.now()}.${extension}`, {
            type: normalizedMime,
          });
          onRecorded(file);
        } else {
          setRecordError("Nenhum som foi capturado. Confira a permissão do microfone.");
        }
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setRecording(false);
      };
      recorder.start(250);
      setRecording(true);
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setRecording(false);
      setRecordError(
        error instanceof Error && error.name === "NotAllowedError"
          ? "Permita o acesso ao microfone para gravar."
          : error instanceof Error
            ? error.message
            : "Não foi possível iniciar a gravação.",
      );
    }
  }

  return (
    <div className="feed-audio-recorder">
      {recording ? (
        <button type="button" className="feed-audio-record-button is-recording" onClick={stopRecording}>
          <Square aria-hidden="true" />
          Parar gravação · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </button>
      ) : (
        <button type="button" className="feed-audio-record-button" onClick={() => void startRecording()}>
          <Mic aria-hidden="true" />
          {seconds > 0 ? "Gravar novamente" : "Gravar agora"}
        </button>
      )}
      <span className="feed-audio-record-hint">Até 3 minutos · a gravação fica privada entre vocês</span>
      {recordError && (
        <div className="feed-audio-record-error" role="alert">
          <span>{recordError}</span>
          <button
            type="button"
            onClick={async () => {
              try {
                const opened = await openMoradosAppSettings();
                if (!opened) setRecordError("No navegador, permita o microfone nas permissões do site e tente novamente.");
              } catch {
                setRecordError("Abra as configurações do Android, entre em Aplicativos, Morados e Permissões.");
              }
            }}
          >
            Permissões do aplicativo
          </button>
        </div>
      )}
    </div>
  );
}

function AnniversaryCard({
  moment,
  compact = false,
}: {
  moment: AnniversaryMoment;
  compact?: boolean;
}) {
  return (
    <article className={compact ? "feed-anniversary-card is-compact" : "feed-anniversary-card"}>
      <div className="feed-anniversary-copy">
        <span><CalendarHeart aria-hidden="true" /> Lembrança chegando</span>
        <h2>Este dia já foi especial.</h2>
        <p>
          {moment.posts.length} {moment.posts.length === 1 ? "foto" : "fotos"} de uma data que vocês viveram.
          A próxima lembrança é {formatMemoryDate(moment.targetDate)}.
        </p>
      </div>
      <div className="feed-anniversary-collage">
        {moment.posts.slice(0, 4).map((post) => (
          <img
            key={post.id}
            src={post.media_url ?? ""}
            alt="Foto de uma lembrança anterior"
            loading="lazy"
          />
        ))}
      </div>
    </article>
  );
}
