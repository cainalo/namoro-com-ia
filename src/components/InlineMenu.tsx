import { useEffect, useId, useRef, useState, type ReactNode } from "react";

type InlineMenuProps = {
  label: string;
  trigger: ReactNode;
  children: (close: () => void) => ReactNode;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  align?: "start" | "end";
};

/**
 * A deliberately lightweight in-tree menu for WebView reliability.
 * It does not create a portal, trap focus, or lock document scrolling.
 */
export function InlineMenu({
  label,
  trigger,
  children,
  className = "",
  triggerClassName = "",
  menuClassName = "",
  align = "end",
}: InlineMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const root = rootRef.current;
      if (root && event.target instanceof Node && !root.contains(event.target)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div
      ref={rootRef}
      className={["safe-inline-menu", align === "start" ? "is-align-start" : "is-align-end", className]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className={["safe-inline-menu-trigger", triggerClassName].filter(Boolean).join(" ")}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        {trigger}
      </button>
      {open && (
        <div id={menuId} className={["safe-inline-menu-panel", menuClassName].filter(Boolean).join(" ")} role="menu" aria-label={label}>
          {children(close)}
        </div>
      )}
    </div>
  );
}
