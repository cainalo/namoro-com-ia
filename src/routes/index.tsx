import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarDays,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  Compass,
  Download,
  Heart,
  Home,
  Gamepad2,
  Images,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AiChat } from "@/components/AiChat";
import { AuthGate, SignOutButton } from "@/components/AuthGate";
import { CoupleSetup } from "@/components/CoupleSetup";
import { CoupleConversation } from "@/components/CoupleConversation";
import { CoupleGames } from "@/components/CoupleGames";
import { CoupleHouse } from "@/components/CoupleHouse";
import { CouplePlans } from "@/components/CouplePlans";
import { CoupleMemories } from "@/components/CoupleMemories";
import { MoradosHeroScene } from "@/components/MoradosHeroScene";
import { listCoupleMemories, type CoupleMemory } from "@/lib/couple-memories";
import { listCouplePlanEvents, type CouplePlanEvent } from "@/lib/couple-plan-events";

type SectionId = "home" | "messages" | "memories" | "organize" | "universe" | "games";

type NavigationItem = {
  id: SectionId;
  label: string;
  icon: LucideIcon;
};

const navigation: NavigationItem[] = [
  { id: "home", label: "Hoje", icon: Home },
  { id: "messages", label: "Conversas", icon: MessageCircle },
  { id: "memories", label: "Memórias", icon: Images },
  { id: "organize", label: "Planos", icon: CalendarDays },
  { id: "universe", label: "Casa", icon: Compass },
];

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
  const date = useMemo(
    () =>
      new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date()),
    [],
  );

  return (
    <AuthGate>
      {(session) => (
        <div className="app-shell min-h-dvh bg-background text-foreground">
      <aside className="app-sidebar">
        <Brand />
        <nav aria-label="Principal" className="app-nav">
          {navigation.map((item) => (
            <NavigationButton
              key={item.id}
              item={item}
              active={activeSection === item.id}
              onClick={() => setActiveSection(item.id)}
            />
          ))}
        </nav>
        <div className="sidebar-account"><SignOutButton /></div>
      </aside>

      <main className="app-main">
        <header className="app-topbar">
          <div className="mobile-brand">
            <Brand compact />
          </div>
          <span className="topbar-space" />
          <Link to="/download" className="topbar-install-link" aria-label="Baixar ou instalar o Morados">
            <Download aria-hidden="true" />
            <span>Instalar app</span>
          </Link>
          <SignOutButton compact />
        </header>

        <div className="page-frame">
          {activeSection === "home" ? (
            <HomeScreen date={date} userId={session.user.id} onNavigate={setActiveSection} />
          ) : activeSection === "messages" ? (
            <CoupleConversation userId={session.user.id} />
          ) : activeSection === "games" ? (
            <CoupleGames userId={session.user.id} />
          ) : activeSection === "universe" ? (
            <CoupleHouse />
          ) : activeSection === "organize" ? (
            <CouplePlans userId={session.user.id} />
          ) : activeSection === "memories" ? (
            <CoupleMemories userId={session.user.id} />
          ) : null}
        </div>
      </main>

      <nav aria-label="Principal" className="mobile-nav">
        {navigation.map((item) => (
          <NavigationButton
            key={item.id}
            item={item}
            active={activeSection === item.id}
            onClick={() => setActiveSection(item.id)}
            mobile
          />
        ))}
      </nav>

      <AiChat />
        </div>
      )}
    </AuthGate>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "brand brand-compact" : "brand"}>
      <span className="pair-mark" aria-hidden="true">
        <span />
        <span />
      </span>
      <span className="brand-word">Morados</span>
    </div>
  );
}

function NavigationButton({
  item,
  active,
  onClick,
  mobile = false,
}: {
  item: NavigationItem;
  active: boolean;
  onClick: () => void;
  mobile?: boolean;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={[
        "nav-button",
        active ? "is-active" : "",
        mobile ? "nav-button-mobile" : "",
      ].join(" ")}
    >
      <Icon aria-hidden="true" />
      <span>{item.label}</span>
    </button>
  );
}

function HomeScreen({
  date,
  userId,
  onNavigate,
}: {
  date: string;
  userId: string;
  onNavigate: (section: SectionId) => void;
}) {
  return (
    <div className="home-screen">
      <div className="home-heading">
        <div>
          <p className="date-kicker">{date}</p>
          <h1>Hoje</h1>
        </div>
        <button
          type="button"
          className="text-action"
          onClick={() => onNavigate("memories")}
        >
          <Images aria-hidden="true" />
          <span>Guardar lembrança</span>
        </button>
      </div>

      <section className="morados-hero" aria-label="Bem-vindos ao Morados">
        <div className="morados-hero-copy">
          <span className="morados-hero-kicker">
            <Sparkles aria-hidden="true" />
            Um espaço de vocês
          </span>
          <h2>
            Um mundo inteiro
            <span> para viver a dois.</span>
          </h2>
          <p>
            Guardem histórias, combinem o próximo encontro e criem pequenos rituais
            que só fazem sentido para vocês.
          </p>
          <div className="morados-hero-actions">
            <button type="button" className="morados-hero-primary" onClick={() => onNavigate("memories")}>
              Guardar uma memória
              <ArrowUpRight aria-hidden="true" />
            </button>
            <button type="button" className="morados-hero-secondary" onClick={() => onNavigate("universe")}>
              Conhecer a casa
            </button>
          </div>
        </div>
        <MoradosHeroScene />
      </section>

      <CoupleSetup userId={userId} />

      <div className="home-columns">
        <section className="home-primary" aria-labelledby="wall-title">
          <div className="section-heading">
            <h2 id="wall-title">Mural</h2>
            <button type="button" className="subtle-action" onClick={() => onNavigate("memories")}>
              Memórias <ChevronRight aria-hidden="true" />
            </button>
          </div>
          <HomeMemoriesPreview
            userId={userId}
            onNavigate={onNavigate}
          />
        </section>

        <aside className="home-secondary">
          <section aria-labelledby="dates-title">
            <div className="section-heading">
              <h2 id="dates-title">Próximas datas</h2>
              <CalendarDays aria-hidden="true" className="heading-icon" />
            </div>
            <HomeUpcomingPlans userId={userId} onNavigate={onNavigate} />
          </section>

          <div className="sidebar-divider" />

          <section aria-labelledby="together-title">
            <div className="section-heading">
              <h2 id="together-title">Por perto</h2>
              <Heart aria-hidden="true" className="heading-icon" />
            </div>
            <div className="shortcut-list">
              <button type="button" onClick={() => onNavigate("messages")}>
                <MessageCircle aria-hidden="true" />
                <span>Conversar</span>
                <ChevronRight aria-hidden="true" />
              </button>
              <button type="button" onClick={() => onNavigate("organize")}>
                <CalendarDays aria-hidden="true" />
                <span>Combinar alguma coisa</span>
                <ChevronRight aria-hidden="true" />
              </button>
              <button type="button" onClick={() => onNavigate("universe")}>
                <Compass aria-hidden="true" />
                <span>Visitar a casa</span>
                <ChevronRight aria-hidden="true" />
              </button>
              <button type="button" onClick={() => onNavigate("games")}>
                <Gamepad2 aria-hidden="true" />
                <span>Jogar a dois</span>
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          </section>
        </aside>
      </div>
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
