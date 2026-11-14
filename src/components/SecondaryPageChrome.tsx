import type { ReactNode } from "react";
import { ArrowLeft, CalendarDays, Gamepad2, Home, Images, Plus } from "lucide-react";
import { useHideOnScroll } from "@/hooks/use-hide-on-scroll";
import { MoradosMark } from "@/components/MoradosMark";

export type SecondaryPageSection = "home" | "games" | "memories" | "organize" | "create-post";

type Props = {
  title: string;
  onBack: () => void;
  backLabel?: string;
  rightAction?: ReactNode;
  activeSection: SecondaryPageSection;
  onNavigate: (section: SecondaryPageSection) => void;
  scrollKey: string;
  contentClassName: string;
  scrollableContent?: boolean;
  brandCenter?: boolean;
  children: ReactNode;
};

const dockItems = [
  { id: "home" as const, label: "Feed", Icon: Home, color: "#555f36" },
  { id: "games" as const, label: "Jogos", Icon: Gamepad2, color: "#6f7b4b" },
  { id: "memories" as const, label: "Memórias", Icon: Images, color: "#8a8848" },
  { id: "organize" as const, label: "Planos", Icon: CalendarDays, color: "#d88e5b" },
];

function DockButton({
  item,
  active,
  onClick,
}: {
  item: (typeof dockItems)[number];
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.Icon;
  return (
    <button
      type="button"
      className={"nav-button nav-button-mobile" + (active ? " is-active" : "")}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      style={active ? { color: item.color } : undefined}
    >
      <span
        className="nav-icon-wrap"
        style={active ? { backgroundColor: `color-mix(in srgb, ${item.color} 15%, transparent)` } : undefined}
      >
        <Icon aria-hidden="true" />
      </span>
      <span className="nav-label">{item.label}</span>
    </button>
  );
}

/**
 * Navigation chrome for full-page secondary screens.
 * It deliberately reuses the same app header, five-slot dock and floating mark.
 */
export function SecondaryPageChrome({
  title,
  onBack,
  backLabel = "Voltar",
  rightAction,
  activeSection,
  onNavigate,
  scrollKey,
  contentClassName,
  scrollableContent = false,
  brandCenter = false,
  children,
}: Props) {
  const hidden = useHideOnScroll(scrollKey);

  return (
    <>
      <header className="app-chrome secondary-page-chrome" data-hidden={hidden} data-no-swipe>
        <div className="app-topbar">
          <div className="topbar-inner secondary-page-topbar-inner">
            <div className="topbar-side topbar-side-leading">
              <button
                type="button"
                className="topbar-icon-button"
                onClick={onBack}
                aria-label={backLabel}
                title={backLabel}
              >
                <ArrowLeft aria-hidden="true" />
              </button>
            </div>
            {brandCenter ? (
              <div className="secondary-page-brand" aria-label="Morados">
                <MoradosMark size={28} />
                <span className="morados-wordmark-text">morados</span>
              </div>
            ) : (
              <h1 className="secondary-page-title" title={title}>{title}</h1>
            )}
            <div className="topbar-side topbar-side-trailing secondary-page-right-action">
              {rightAction}
            </div>
          </div>
        </div>
      </header>

      <button
        type="button"
        className="morados-floating-wordmark secondary-page-floating-wordmark"
        data-visible={hidden}
        aria-label="Voltar ao Feed"
        aria-hidden={!hidden}
        tabIndex={hidden ? 0 : -1}
        onClick={() => onNavigate("home")}
      >
        <span className="morados-wordmark-lockup">
          <MoradosMark size={28} />
          <span className="morados-wordmark-text">morados</span>
        </span>
      </button>

      {scrollableContent ? (
        <div className={contentClassName} data-chrome-scroll>
          {children}
        </div>
      ) : (
        <div className={contentClassName}>
          {children}
        </div>
      )}

      <nav
        aria-label="Navegação principal"
        className="mobile-nav secondary-page-mobile-nav"
        data-hidden={hidden}
      >
        <DockButton item={dockItems[0]} active={activeSection === "home"} onClick={() => onNavigate("home")} />
        <DockButton item={dockItems[1]} active={activeSection === "games"} onClick={() => onNavigate("games")} />
        <button
          type="button"
          className="mobile-nav-create"
          onClick={() => onNavigate("create-post")}
          aria-label={activeSection === "create-post" ? "Editor de publicação aberto" : "Criar publicação"}
          aria-current={activeSection === "create-post" ? "page" : undefined}
          title="Criar publicação"
          disabled={activeSection === "create-post"}
        >
          <Plus aria-hidden="true" />
        </button>
        <DockButton item={dockItems[2]} active={activeSection === "memories"} onClick={() => onNavigate("memories")} />
        <DockButton item={dockItems[3]} active={activeSection === "organize"} onClick={() => onNavigate("organize")} />
      </nav>
    </>
  );
}
