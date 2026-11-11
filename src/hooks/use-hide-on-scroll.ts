import { useEffect, useState } from "react";

const SCROLL_STEP = 8;
const TOP_THRESHOLD = 64;

/**
 * Recolhe o cabeçalho e o dock ao rolar para baixo; reapresenta ao rolar para cima
 * ou ao voltar para perto do topo. Também acompanha áreas internas com rolagem vertical.
 */
export function useHideOnScroll(resetKey: string | number) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(false);

    let lastSource: Window | HTMLElement = window;
    let lastY = window.scrollY;
    let pendingSource: Window | HTMLElement = window;
    let frame = 0;

    const update = () => {
      frame = 0;
      const source = pendingSource;
      const currentY = source === window ? window.scrollY : source.scrollTop;

      if (source !== lastSource) {
        lastSource = source;
        lastY = currentY;
        setHidden(false);
        return;
      }

      const delta = currentY - lastY;
      if (currentY <= TOP_THRESHOLD) {
        setHidden(false);
      } else if (delta > SCROLL_STEP) {
        setHidden(true);
      } else if (delta < -SCROLL_STEP) {
        setHidden(false);
      }

      if (Math.abs(delta) > SCROLL_STEP) lastY = currentY;
    };

    const schedule = (source: Window | HTMLElement) => {
      pendingSource = source;
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    const onWindowScroll = () => schedule(window);
    const onInnerScroll = (event: Event) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.scrollHeight > target.clientHeight + 8
      ) {
        schedule(target);
      }
    };

    window.addEventListener("scroll", onWindowScroll, { passive: true });
    document.addEventListener("scroll", onInnerScroll, {
      capture: true,
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", onWindowScroll);
      document.removeEventListener("scroll", onInnerScroll, true);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [resetKey]);

  return hidden;
}
