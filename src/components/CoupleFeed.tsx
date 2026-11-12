import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowRight,
  CalendarHeart,
  Camera,
  Gamepad2,
  ImagePlus,
  LoaderCircle,
  MessageCircle,
  Send,
  Sparkles,
} from "lucide-react";
import { CoupleSetup } from "@/components/CoupleSetup";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { createCoupleMediaUrl, uploadCoupleMedia } from "@/lib/couple-media";
import {
  createCouplePost,
  listCouplePosts,
  type CouplePost,
} from "@/lib/couple-feed";

type FeedPostView = CouplePost & {
  author_name: string;
  media_url: string | null;
};

type FeedState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "no-couple" }
  | { status: "ready"; coupleId: string; posts: FeedPostView[] };

type FeedFilter = "all" | "photos" | "videos" | "text";

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
    emoji: "🔴",
    accent: "coral",
  },
  {
    title: "Vamos jogar damas?",
    detail: "Preparem as peças e vejam quem pensa alguns lances à frente",
    label: "Clássico",
    game: "Damas",
    emoji: "♟️",
    accent: "green",
  },
  {
    title: "Um desafio de perguntas?",
    detail: "Descubram como cada um pensa e comparem as respostas",
    label: "Desafio",
    game: "Isto ou aquilo?",
    emoji: "💭",
    accent: "violet",
  },
  {
    title: "Que tal uma batalha naval?",
    detail: "Escolham suas frotas e tentem descobrir onde o outro se escondeu",
    label: "Dedução",
    game: "Batalha naval",
    emoji: "🚢",
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
    .join("") || "♡";
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
  const [draft, setDraft] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [postFilter, setPostFilter] = useState<FeedFilter>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (postComposerRequest > 0) setComposerOpen(true);
  }, [postComposerRequest]);

  useEffect(() => {
    if (!selectedMedia) {
      setMediaPreview(null);
      return;
    }
    const preview = URL.createObjectURL(selectedMedia);
    setMediaPreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [selectedMedia]);

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
      const profileMap = new Map<string, string>();

      if (authorIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", authorIds);
        if (profilesError) throw profilesError;
        for (const profile of profiles ?? []) {
          profileMap.set(profile.id, profile.display_name?.trim() || "");
        }
      }

      const mediaResults = await Promise.all(
        rows.map(async (post) => {
          if (!post.media_path) return [post.id, null] as const;
          const signed = await createCoupleMediaUrl(post.media_path);
          return [post.id, signed.url] as const;
        }),
      );
      const mediaMap = new Map(mediaResults);
      const posts: FeedPostView[] = rows.map((post) => ({
        ...post,
        author_name:
          profileMap.get(post.author_id) ||
          (post.author_id === userId ? "Você" : "Sua pessoa"),
        media_url: mediaMap.get(post.id) ?? null,
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
      if (postFilter === "photos") return post.media_mime?.startsWith("image/") ?? false;
      if (postFilter === "videos") return post.media_mime?.startsWith("video/") ?? false;
      if (postFilter === "text") return Boolean(post.body?.trim()) && !post.media_mime;
      return true;
    });
  }, [state, postFilter]);

  async function publishPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status !== "ready" || publishing) return;
    const body = draft.trim();
    if (!body && !selectedMedia) return;

    setPublishing(true);
    setPublishError(null);
    let mediaPath: string | null = null;

    try {
      if (selectedMedia) {
        const upload = await uploadCoupleMedia({
          coupleId: state.coupleId,
          userId,
          scope: "feed",
          file: selectedMedia,
        });
        if (upload.error || !upload.path) throw upload.error ?? new Error("upload_failed");
        mediaPath = upload.path;
      }

      const result = await createCouplePost({
        coupleId: state.coupleId,
        authorId: userId,
        body,
        mediaPath,
        mediaName: selectedMedia?.name ?? null,
        mediaMime: selectedMedia?.type ?? null,
      });
      if (result.error) throw result.error;

      setDraft("");
      setComposerOpen(false);
      setSelectedMedia(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setRefreshKey((current) => current + 1);
    } catch (error) {
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
          <div className="feed-empty-illustration">♡</div>
          <h2>O feed de vocês começa aqui.</h2>
          <p>Vincule a outra pessoa para criar um espaço compartilhado de publicações, fotos e lembranças.</p>
        </div>
        <CoupleSetup userId={userId} />
      </section>
    );
  }

  return (
    <section className="social-feed">
      <div className="feed-filter-bar" role="group" aria-label="Filtrar publicações">
        {([
          ["all", "Tudo"],
          ["photos", "Fotos"],
          ["videos", "Vídeos"],
          ["text", "Textos"],
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

      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent className="feed-publisher-dialog">
          <DialogHeader className="feed-publisher-header">
            <DialogTitle>Compartilhar um momento</DialogTitle>
            <DialogDescription>Uma foto, um vídeo ou algumas palavras para guardar entre vocês.</DialogDescription>
          </DialogHeader>
      <form className="feed-composer" onSubmit={publishPost}>
        <div className="feed-composer-top">
          <span className="feed-composer-avatar">{initials("Você")}</span>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="O que você quer compartilhar com ela?"
            rows={2}
            maxLength={5000}
            aria-label="Escreva uma publicação"
            disabled={publishing}
          />
        </div>
        {selectedMedia && mediaPreview && (
          <div className="feed-media-preview">
            {selectedMedia.type.startsWith("video/") ? (
              <video src={mediaPreview} controls playsInline />
            ) : (
              <img src={mediaPreview} alt="Prévia da publicação" />
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedMedia(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              aria-label="Remover mídia"
            >
              ×
            </button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/mp4,video/webm,video/quicktime"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            if (file) setSelectedMedia(file);
          }}
        />
        <div className="feed-composer-footer">
          <button type="button" className="feed-composer-media" onClick={() => fileInputRef.current?.click()}>
            <ImagePlus aria-hidden="true" />
            <span>Foto ou vídeo</span>
          </button>
          <span className="feed-composer-private"><span /> Só vocês dois</span>
          <button
            type="submit"
            className="feed-publish-button"
            disabled={publishing || (!draft.trim() && !selectedMedia)}
          >
            {publishing ? <LoaderCircle aria-hidden="true" /> : <Send aria-hidden="true" />}
            Publicar
          </button>
        </div>
        {publishError && <p className="feed-publish-error" role="alert">{publishError}</p>}
      </form>
        </DialogContent>
      </Dialog>

      <div className="social-feed-list">
        {state.posts.length === 0 ? (
          <div className="feed-empty-state">
            <div className="feed-empty-illustration">✿</div>
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

              return (
                <div className="feed-sequence" key={post.id}>
                  <article className="feed-post-card">
                    <header className="feed-post-header">
                      <span className={post.author_id === userId ? "feed-author-avatar is-you" : "feed-author-avatar"}>
                        {initials(post.author_name)}
                      </span>
                      <div>
                        <strong>{post.author_name}</strong>
                        <time dateTime={post.created_at}>{formatFeedDate(post.created_at)}</time>
                      </div>
                      <span className="feed-post-private">A dois</span>
                    </header>
                    {post.body && <p className="feed-post-body">{post.body}</p>}
                    {post.media_url && post.media_mime?.startsWith("image/") && (
                      <img className="feed-post-image" src={post.media_url} alt={post.media_name || "Foto compartilhada"} loading="lazy" />
                    )}
                    {post.media_url && post.media_mime?.startsWith("video/") && (
                      <video className="feed-post-video" src={post.media_url} controls playsInline preload="metadata" />
                    )}
                    <footer className="feed-post-footer">
                      <span><Camera aria-hidden="true" /> Um momento de vocês</span>
                      <button type="button" onClick={onOpenConversation}>
                        <MessageCircle aria-hidden="true" /> Comentar na conversa
                      </button>
                    </footer>
                  </article>

                  {showMemoryCards && anniversaryMoments.map((moment) => (
                    <AnniversaryCard key={moment.monthDay} moment={moment} />
                  ))}

                  {showGameCard && (
                    <article className={"feed-game-card is-" + game.accent}>
                      <div className="feed-game-art" aria-hidden="true">{game.emoji}</div>
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
