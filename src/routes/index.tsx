import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarDays,
  ChevronRight,
  Compass,
  Heart,
  Home,
  Gamepad2,
  Images,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AiChat } from "@/components/AiChat";
import { AuthGate, SignOutButton } from "@/components/AuthGate";
import { CoupleSetup } from "@/components/CoupleSetup";
import { CoupleConversation } from "@/components/CoupleConversation";
import { CoupleGames } from "@/components/CoupleGames";
import { CoupleHouse } from "@/components/CoupleHouse";
import { CouplePlans } from "@/components/CouplePlans";
import { CoupleMemories } from "@/components/CoupleMemories";
import { listCoupleMemories, type CoupleMemory } from "@/lib/couple-memories";

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

const emptyStates: Record<
  Exclude<SectionId, "home" | "games" | "universe" | "organize" | "memories">,
  { title: string; message: string; icon: LucideIcon }
> = {
  messages: { title: "Conversas", message: "As mensagens de vocês aparecerão aqui.", icon: MessageCircle },
  organize: { title: "Planos", message: "Datas, tarefas e projetos aparecerão aqui.", icon: CalendarDays },
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Namoro" },
      { name: "description", content: "Um espaço para duas pessoas." },
      { property: "og:title", content: "Namoro" },
      { property: "og:description", content: "Um espaço para duas pessoas." },
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
          <SignOutButton compact />
        </header>

        <div className="page-frame">
          <div className={activeSection === "home" ? undefined : "section-hidden"} aria-hidden={activeSection !== "home"}>
            <HomeScreen date={date} userId={session.user.id} onNavigate={setActiveSection} />
          </div>
          {activeSection === "messages" ? (
            <CoupleConversation userId={session.user.id} />
          ) : activeSection === "games" ? (
            <CoupleGames userId={session.user.id} />
          ) : activeSection === "universe" ? (
            <CoupleHouse />
          ) : activeSection === "organize" ? (
            <CouplePlans />
          ) : activeSection === "memories" ? (
            <CoupleMemories userId={session.user.id} />
          ) : activeSection !== "home" ? (
            <EmptySection section={activeSection} />
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
      <span className="brand-word">namoro</span>
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
            <div className="compact-empty">
              <p>Nenhuma data marcada.</p>
              <button
                type="button"
                className="inline-action"
                onClick={() => onNavigate("organize")}
              >
                Abrir calendário <ChevronRight aria-hidden="true" />
              </button>
            </div>
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

  useEffect(() => {
    let active = true;

    async function loadPreview() {
      try {
        const result = await listCoupleMemories(3);
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

        setState({
          status: "ready",
          memories: result.data ?? [],
        });
      } catch {
        if (active) setState({ status: "error" });
      }
    }

    void loadPreview();
    return () => {
      active = false;
    };
  }, [userId]);

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

function EmptySection({ section }: { section: Exclude<SectionId, "home" | "games" | "universe" | "organize" | "memories"> }) {
  const detail = emptyStates[section];
  const Icon = detail.icon;

  return (
    <section className="module-empty" aria-labelledby="module-title">
      <h1 id="module-title">{detail.title}</h1>
      <div className="module-empty-content">
        <span className="module-empty-icon" aria-hidden="true">
          <Icon />
        </span>
        <p>{detail.message}</p>
      </div>
    </section>
  );
}
