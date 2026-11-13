import { createFileRoute, Link } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import {
  CalendarDays,
  ChevronRight,
  Compass,
  Download,
  Home,
  Gamepad2,
  Images,
  Menu,
  Plus,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AiChat } from "@/components/AiChat";
import { AuthGate } from "@/components/AuthGate";
import { CoupleSetup } from "@/components/CoupleSetup";
import { CoupleConversation } from "@/components/CoupleConversation";
import { CoupleFeed } from "@/components/CoupleFeed";
import { CoupleGames } from "@/components/CoupleGames";
import { CoupleHouse } from "@/components/CoupleHouse";
import { CouplePlans } from "@/components/CouplePlans";
import { CoupleMemories } from "@/components/CoupleMemories";
import { CoupleProfile, ProfileAvatarButton } from "@/components/CoupleProfile";
import { MoradosHeroScene } from "@/components/MoradosHeroScene";
import { listCoupleMemories, type CoupleMemory } from "@/lib/couple-memories";
import { listCouplePlanEvents, type CouplePlanEvent } from "@/lib/couple-plan-events";
import { useHideOnScroll } from "@/hooks/use-hide-on-scroll";
import { MoradosMark } from "@/components/MoradosMark";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SectionId = "home" | "messages" | "memories" | "organize" | "universe" | "games" | "profile" | "create-post";

type NavigationItem = {
  id: SectionId;
  label: string;
  icon: LucideIcon;
};

const navigation: NavigationItem[] = [
  { id: "home", label: "Feed", icon: Home },
  { id: "games", label: "Jogos", icon: Gamepad2 },
  { id: "memories", label: "Memórias", icon: Images },
  { id: "organize", label: "Planos", icon: CalendarDays },
  { id: "universe", label: "Casa", icon: Compass },
];

const bottomNavigation = navigation.filter((item) => item.id !== "universe");

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Morados" },
      { name: "description", content: "Morados — um espaço para duas pessoas." },
      { property: "og:title", content: "Morados" },
      { property: "og:description", content: "Morados — um espaço para duas pessoas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const [activeSection, setActiveSection] = useState<SectionId>("home");
  const sectionHistory = useRef<SectionId[]>([]);
  const activeSectionRef = useRef<SectionId>("home");
  const chromeHidden = useHideOnScroll(activeSection);

  const goToSection = useCallback((section: SectionId) => {
    if (activeSectionRef.current === section) return;
    sectionHistory.current = [...sectionHistory.current, activeSectionRef.current].slice(-20);
    activeSectionRef.current = section;
    setActiveSection(section);
  }, []);

  const goHome = useCallback(() => {
    sectionHistory.current = [];
    activeSectionRef.current = "home";
    setActiveSection("home");
  }, []);

  const goBack = useCallback(() => {
    const previous = sectionHistory.current.pop() ?? "home";
    activeSectionRef.current = previous;
    setActiveSection(previous);
  }, []);

  const openConversation = useCallback(() => goToSection("messages"), [goToSection]);

  useEffect(() => {
    let start: { x: number; y: number } | null = null;

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        start = null;
        return;
      }
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("input, textarea, select, [contenteditable='true'], [data-no-swipe], [data-horizontal-scroll]")
      ) {
        start = null;
        return;
      }
      const point = event.touches[0];
      start = { x: point.clientX, y: point.clientY };
    };

    const onTouchEnd = (event: TouchEvent) => {
      const origin = start;
      start = null;
      const point = event.changedTouches[0];
      if (!origin || !point) return;

      const dx = point.clientX - origin.x;
      const dy = point.clientY - origin.y;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.15) return;

      if (activeSectionRef.current === "home" && dx < 0) {
        goToSection("messages");
      } else if (activeSectionRef.current === "messages" && dx > 0) {
        goBack();
      }
    };

    const onTouchCancel = () => {
      start = null;
    };

    // Captura o gesto antes dos elementos internos; a rolagem vertical continua nativa.
    window.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
    window.addEventListener("touchend", onTouchEnd, { capture: true, passive: true });
    window.addEventListener("touchcancel", onTouchCancel, { capture: true, passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart, true);
      window.removeEventListener("touchend", onTouchEnd, true);
      window.removeEventListener("touchcancel", onTouchCancel, true);
    };
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let mounted = true;
    let listener: { remove: () => Promise<void> } | undefined;

    void App.addListener("backButton", () => {
      if (document.documentElement.dataset.moradosGameOpen === "true") {
        window.dispatchEvent(new Event("morados:game-back"));
        return;
      }
      if (activeSectionRef.current !== "home") {
        const previous = sectionHistory.current.pop() ?? "home";
        activeSectionRef.current = previous;
        setActiveSection(previous);
      } else {
        void App.exitApp();
      }
    }).then((handle) => {
      if (mounted) listener = handle;
      else void handle.remove();
    });

    return () => {
      mounted = false;
      void listener?.remove();
    };
  }, [activeSection]);


  return (
    <AuthGate>
      {(session) => (
        <div
          className={`app-shell min-h-dvh bg-background text-foreground ${activeSection === "messages" ? "is-conversation-mode" : activeSection === "create-post" ? "is-post-composer-mode" : ""}`}
        >
          {activeSection !== "messages" && activeSection !== "create-post" && (
            <>
              <header className="app-chrome" data-hidden={chromeHidden}>
                <div className="app-topbar">
                  <div className="topbar-inner">
                    <div className="topbar-side topbar-side-leading">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="topbar-icon-button" aria-label="Abrir menu de navegação" title="Menu">
                            <Menu aria-hidden="true" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" sideOffset={8} className="morados-nav-menu nc-menu">
                          <DropdownMenuItem className="nc-menu-item" onSelect={() => goToSection("games")}><Gamepad2 aria-hidden="true" /> Jogos</DropdownMenuItem>
                          <DropdownMenuItem className="nc-menu-item" onSelect={() => goToSection("memories")}><Images aria-hidden="true" /> Memórias</DropdownMenuItem>
                          <DropdownMenuItem className="nc-menu-item" onSelect={() => goToSection("organize")}><CalendarDays aria-hidden="true" /> Planos</DropdownMenuItem>
                          <DropdownMenuItem className="nc-menu-item" onSelect={() => goToSection("universe")}><Compass aria-hidden="true" /> Casa</DropdownMenuItem>
                          <DropdownMenuSeparator className="nc-menu-sep" />
                          <DropdownMenuItem asChild className="nc-menu-item"><Link to="/download"><Download aria-hidden="true" /> Baixar aplicativo</Link></DropdownMenuItem>
                          <DropdownMenuItem className="nc-menu-item" onSelect={() => {
                            void supabase.auth.signOut().then(({ error }) => {
                              if (error) console.error("Não foi possível sair da conta.", error);
                            }).catch((error) => console.error("Não foi possível sair da conta.", error));
                          }}><LogOut aria-hidden="true" /> Sair da conta</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <button type="button" className="topbar-wordmark" onClick={goHome} aria-label="Morados — voltar ao Feed" title="Feed">
                      <MoradosWordmark />
                    </button>

                    <div className="topbar-side topbar-side-trailing">
                      <ProfileAvatarButton userId={session.user.id} onClick={() => goToSection("profile")} />
                    </div>
                  </div>
                </div>
              </header>

              <button
                type="button"
                className="morados-floating-wordmark"
                data-visible={chromeHidden}
                aria-label="Voltar ao Feed"
                aria-hidden={!chromeHidden}
                tabIndex={chromeHidden ? 0 : -1}
                onClick={goHome}
              >
                <MoradosWordmark />
              </button>
            </>
          )}

          <main className={activeSection === "messages" ? "app-main app-main-conversation" : activeSection === "create-post" ? "app-main app-main-post-composer" : "app-main"}>
            {activeSection === "messages" ? (
              <CoupleConversation userId={session.user.id} onBack={goBack} />
            ) : (
              <div className="page-frame">
              {activeSection === "home" || activeSection === "create-post" ? (
                <HomeScreen
                  userId={session.user.id}
                  onNavigate={goToSection}
                  onOpenConversation={openConversation}
                  isComposerPage={activeSection === "create-post"}
                  onCloseComposerPage={goBack}
                />
              ) : activeSection === "games" ? (
                <CoupleGames userId={session.user.id} />
              ) : activeSection === "profile" ? (
                <CoupleProfile userId={session.user.id} />
              ) : activeSection === "universe" ? (
                <CoupleHouse />
              ) : activeSection === "organize" ? (
                <CouplePlans userId={session.user.id} />
              ) : activeSection === "memories" ? (
                <CoupleMemories userId={session.user.id} />
              ) : null}
              </div>
            )}
          </main>

          {activeSection !== "messages" && activeSection !== "create-post" && (
            <nav
              aria-label="Navegação principal"
              className="mobile-nav"
              data-hidden={chromeHidden}
            >
              <NavigationButton
                item={bottomNavigation[0]}
                active={activeSection === bottomNavigation[0].id}
                onClick={() => goToSection(bottomNavigation[0].id)}
                mobile
              />
              <NavigationButton
                item={bottomNavigation[1]}
                active={activeSection === bottomNavigation[1].id}
                onClick={() => goToSection(bottomNavigation[1].id)}
                mobile
              />
              <button
                type="button"
                className="mobile-nav-create"
                onClick={() => goToSection("create-post")}
                aria-label="Criar publicação"
                title="Criar publicação"
              >
                <Plus aria-hidden="true" />
              </button>
              <NavigationButton
                item={bottomNavigation[2]}
                active={activeSection === bottomNavigation[2].id}
                onClick={() => goToSection(bottomNavigation[2].id)}
                mobile
              />
              <NavigationButton
                item={bottomNavigation[3]}
                active={activeSection === bottomNavigation[3].id}
                onClick={() => goToSection(bottomNavigation[3].id)}
                mobile
              />
            </nav>
          )}

          {activeSection !== "messages" && activeSection !== "create-post" && <AiChat />}
        </div>
      )}
    </AuthGate>
  );
}

const NAV_ACCENTS: Record<SectionId, string> = {
  home: "#555f36",
  messages: "#a64b24",
  memories: "#8a8848",
  organize: "#d88e5b",
  universe: "#657551",
  games: "#6f7b4b",
  profile: "#0F4C5C",
  "create-post": "#555f36",
};

function MoradosWordmark() {
  return (
    <span className="morados-wordmark-lockup">
      <MoradosMark size={30} />
      <span className="morados-wordmark-text">morados</span>
    </span>
  );
}

function NavigationButton({
  item,
  active,
  onClick,
  mobile = false,
  desktop = false,
}: {
  item: NavigationItem;
  active: boolean;
  onClick: () => void;
  mobile?: boolean;
  desktop?: boolean;
}) {
  const Icon = item.icon;
  const accent = NAV_ACCENTS[item.id];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={[
        "nav-button",
        active ? "is-active" : "",
        mobile ? "nav-button-mobile" : "",
        desktop ? "nav-button-desktop" : "",
      ].join(" ")}
      style={active ? { color: accent, ...(desktop ? { borderBottomColor: accent } : {}) } : undefined}
    >
      <span
        className="nav-icon-wrap"
        style={active ? { backgroundColor: `color-mix(in srgb, ${accent} 15%, transparent)` } : undefined}
      >
        <Icon aria-hidden="true" />
      </span>
      <span className="nav-label">{item.label}</span>
    </button>
  );
}

function HomeScreen({
  userId,
  onNavigate,
  onOpenConversation,
  isComposerPage,
  onCloseComposerPage,
}: {
  userId: string;
  onNavigate: (section: SectionId) => void;
  onOpenConversation: () => void;
  isComposerPage: boolean;
  onCloseComposerPage: () => void;
}) {
  return (
    <div className="home-screen">
      <CoupleFeed
        userId={userId}
        onNavigate={onNavigate}
        onOpenConversation={onOpenConversation}
        isComposerPage={isComposerPage}
        onCloseComposerPage={onCloseComposerPage}
      />
    </div>
  );
}

type HomeUpcomingState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "database-pending" }
  | { status: "ready"; events: CouplePlanEvent[] };

function localDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatUpcomingDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function HomeUpcomingPlans({
  userId,
  onNavigate,
}: {
  userId: string;
  onNavigate: (section: SectionId) => void;
}) {
  const [state, setState] = useState<HomeUpcomingState>({ status: "loading" });
  const [coupleId, setCoupleId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadUpcoming() {
      const now = new Date();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 60);
      const todayKey = localDateKey(now);

      try {
        const { data: membership, error: membershipError } = await supabase
          .from("couple_members")
          .select("couple_id")
          .eq("user_id", userId)
          .is("ended_at", null)
          .maybeSingle();

        if (membershipError) throw membershipError;
        if (!active) return;

        let activeCoupleId: string | null = null;
        if (membership?.couple_id) {
          const { data: couple, error: coupleError } = await supabase
            .from("couples")
            .select("id, status")
            .eq("id", membership.couple_id)
            .maybeSingle();

          if (coupleError) throw coupleError;
          if (couple?.status === "active") activeCoupleId = couple.id;
        }
        setCoupleId(activeCoupleId);

        const result = await listCouplePlanEvents(todayKey, localDateKey(end));
        if (!active) return;

        if (result.error) {
          setState({
            status:
              result.error.code === "42P01" || result.error.code === "PGRST205"
                ? "database-pending"
                : "error",
          });
          return;
        }

        const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        const upcoming = (result.data ?? []).filter((event) =>
          event.event_date !== todayKey ||
          event.all_day ||
          !event.start_time ||
          event.start_time.slice(0, 5) >= currentTime
        );

        setState({ status: "ready", events: upcoming.slice(0, 3) });
      } catch {
        if (active) setState({ status: "error" });
      }
    }

    void loadUpcoming();
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!coupleId) return;

    let mounted = true;
    const channel = supabase
      .channel(`home-upcoming-plans:${coupleId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "couple_plan_events",
          filter: `couple_id=eq.${coupleId}`,
        },
        () => {
          if (mounted) {
            const today = new Date();
            const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 60);
            void listCouplePlanEvents(localDateKey(today), localDateKey(end)).then((result) => {
              if (mounted && !result.error) {
                const now = new Date();
                const todayKey = localDateKey(now);
                const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
                const upcoming = (result.data ?? []).filter((event) =>
                  event.event_date !== todayKey ||
                  event.all_day ||
                  !event.start_time ||
                  event.start_time.slice(0, 5) >= currentTime
                );
                setState({ status: "ready", events: upcoming.slice(0, 3) });
              }
            });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "couple_plan_events",
          filter: `couple_id=eq.${coupleId}`,
        },
        () => {
          if (mounted) {
            const today = new Date();
            const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 60);
            void listCouplePlanEvents(localDateKey(today), localDateKey(end)).then((result) => {
              if (mounted && !result.error) setState({ status: "ready", events: (result.data ?? []).slice(0, 3) });
            });
          }
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [coupleId]);

  if (state.status === "loading") {
    return <div className="compact-empty"><p>Carregando datas…</p></div>;
  }

  if (state.status === "database-pending") {
    return (
      <div className="compact-empty">
        <p>A agenda está sendo preparada.</p>
        <button type="button" className="inline-action" onClick={() => onNavigate("organize")}>
          Abrir calendário <ChevronRight aria-hidden="true" />
        </button>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="compact-empty">
        <p>Não foi possível carregar as datas.</p>
        <button type="button" className="inline-action" onClick={() => onNavigate("organize")}>
          Abrir calendário <ChevronRight aria-hidden="true" />
        </button>
      </div>
    );
  }

  if (state.events.length === 0) {
    return (
      <div className="compact-empty">
        <p>Nenhuma data marcada para os próximos dias.</p>
        <button type="button" className="inline-action" onClick={() => onNavigate("organize")}>
          Abrir calendário <ChevronRight aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className="home-upcoming-list">
      {state.events.map((event) => (
        <button
          type="button"
          className="home-upcoming-entry"
          key={event.id}
          onClick={() => onNavigate("organize")}
        >
          <span className="home-upcoming-date">{formatUpcomingDate(event.event_date)}</span>
          <span className="home-upcoming-copy">
            <strong>{event.title}</strong>
            <span>
              {event.all_day || !event.start_time
                ? "Dia inteiro"
                : event.start_time.slice(0, 5)}
              {event.place ? ` · ${event.place}` : ""}
            </span>
          </span>
          <ChevronRight aria-hidden="true" />
        </button>
      ))}
      <button type="button" className="inline-action" onClick={() => onNavigate("organize")}>
        Abrir calendário <ChevronRight aria-hidden="true" />
      </button>
    </div>
  );
}

type HomeMemoriesState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "database-pending" }
  | { status: "ready"; memories: CoupleMemory[] };

function formatHomeMemoryDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function HomeMemoriesPreview({
  userId,
  onNavigate,
}: {
  userId: string;
  onNavigate: (section: SectionId) => void;
}) {
  const [state, setState] = useState<HomeMemoriesState>({ status: "loading" });
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadPreview() {
      try {
        const { data: membership, error: membershipError } = await supabase
          .from("couple_members")
          .select("couple_id")
          .eq("user_id", userId)
          .is("ended_at", null)
          .maybeSingle();

        if (membershipError) throw membershipError;
        if (!active) return;

        let activeCoupleId: string | null = null;
        if (membership?.couple_id) {
          const { data: couple, error: coupleError } = await supabase
            .from("couples")
            .select("id, status")
            .eq("id", membership.couple_id)
            .maybeSingle();

          if (coupleError) throw coupleError;
          if (couple?.status === "active") activeCoupleId = couple.id;
        }
        setCoupleId(activeCoupleId);

        const result = await listCoupleMemories(100);
        if (!active) return;

        if (result.error) {
          setState({
            status:
              result.error.code === "42P01" || result.error.code === "PGRST205"
                ? "database-pending"
                : "error",
          });
          return;
        }

        const visible = (result.data ?? []).filter(
          (memory) =>
            memory.visibility === "private" ||
            (memory.visibility === "shared" && memory.couple_id === activeCoupleId),
        );
        setState({
          status: "ready",
          memories: visible.slice(0, 3),
        });
      } catch {
        if (active) setState({ status: "error" });
      }
    }

    void loadPreview();
    return () => {
      active = false;
    };
  }, [userId, refreshKey]);

  useEffect(() => {
    if (!coupleId) return;

    let mounted = true;
    const channel = supabase
      .channel(`home-memories:${coupleId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "couple_memories",
          filter: `couple_id=eq.${coupleId}`,
        },
        () => {
          if (mounted) setRefreshKey((current) => current + 1);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "couple_memories",
          filter: `couple_id=eq.${coupleId}`,
        },
        () => {
          if (mounted) setRefreshKey((current) => current + 1);
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [coupleId]);

  if (state.status === "loading") {
    return <p className="wall-preview-state" role="status">Carregando lembranças…</p>;
  }

  if (state.status === "database-pending") {
    return (
      <p className="wall-preview-state">
        A biblioteca de lembranças está sendo preparada.
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <div className="wall-preview-state">
        <p>Não foi possível carregar o mural.</p>
        <button
          type="button"
          className="inline-action"
          onClick={() => onNavigate("memories")}
        >
          Abrir Memórias <ChevronRight aria-hidden="true" />
        </button>
      </div>
    );
  }

  if (state.memories.length === 0) {
    return (
      <div className="wall-empty">
        <div className="empty-symbol" aria-hidden="true">
          <Images />
        </div>
        <p className="empty-title">Ainda não há lembranças.</p>
        <button
          type="button"
          className="primary-action"
          onClick={() => onNavigate("memories")}
        >
          Guardar a primeira
        </button>
      </div>
    );
  }

  return (
    <div className="wall-memory-list" aria-live="polite">
      {state.memories.map((memory) => (
        <button
          type="button"
          className="wall-memory-entry"
          key={memory.id}
          onClick={() => onNavigate("memories")}
        >
          <span className="wall-memory-date">{formatHomeMemoryDate(memory.memory_date)}</span>
          <span className="wall-memory-copy">
            <strong>{memory.title || "Lembrança sem título"}</strong>
            <span>{memory.body}</span>
          </span>
          <span
            className={memory.visibility === "shared" ? "wall-memory-visibility is-shared" : "wall-memory-visibility"}
          >
            {memory.visibility === "shared" ? "A dois" : memory.owner_id === userId ? "Privada" : "Compartilhada"}
          </span>
        </button>
      ))}
    </div>
  );
}
