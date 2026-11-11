import { useEffect, useState } from "react";

const SCROLL_STEP = 8;
const TOP_THRESHOLD = 64;

type ScrollSource = Window | HTMLElement;

/**
 * Mantém o cabeçalho e o dock no mesmo estado:
 * - rolagem para baixo: recolhe os dois;
 * - rolagem para cima: mostra os dois;
 * - perto do topo: mantém os dois visíveis.
 *
 * A rolagem principal pode vir da janela/documento. Telas com uma área própria
 * de rolagem devem marcá-la com data-chrome-scroll (ex.: histórico da conversa).
 */
export function useHideOnScroll(resetKey: string | number) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(false);

    // Cada área mantém sua própria posição anterior. Assim, ao passar da página
    // para uma lista interna, o primeiro gesto já é interpretado corretamente.
    const previousPositions = new WeakMap<object, number>();
    const rootScrollTop = () => {
      const scrollingElement = document.scrollingElement;
      return Math.max(
        0,
        window.scrollY || 0,
        window.pageYOffset || 0,
        scrollingElement?.scrollTop || 0,
        document.documentElement.scrollTop || 0,
        document.body?.scrollTop || 0,
      );
    };
    const readPosition = (source: ScrollSource) =>
      source === window ? rootScrollTop() : Math.max(0, source.scrollTop);

    previousPositions.set(window, rootScrollTop());
    document
      .querySelectorAll<HTMLElement>("[data-chrome-scroll]")
      .forEach((element) => previousPositions.set(element, element.scrollTop));

    let pendingSource: ScrollSource | null = null;
    let frame = 0;

    const update = () => {
      frame = 0;
      const source = pendingSource;
      pendingSource = null;
      if (!source) return;

      const currentY = readPosition(source);
      // Uma área interna pode aparecer depois do carregamento inicial e já receber
      // um scrollTo programático (por exemplo, a conversa vai direto à última mensagem).
      // Nesse primeiro evento apenas registramos a posição; somente gestos seguintes
      // do usuário devem recolher as barras.
      if (!previousPositions.has(source)) {
        previousPositions.set(source, currentY);
        return;
      }

      const previousY = previousPositions.get(source) ?? currentY;
      const delta = currentY - previousY;

      if (currentY <= TOP_THRESHOLD) {
        setHidden(false);
        previousPositions.set(source, currentY);
      } else if (delta > SCROLL_STEP) {
        setHidden(true);
        previousPositions.set(source, currentY);
      } else if (delta < -SCROLL_STEP) {
        setHidden(false);
        previousPositions.set(source, currentY);
      }
    };

    const schedule = (source: ScrollSource) => {
      pendingSource = source;
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    const onWindowScroll = () => schedule(window);
    const onDocumentScroll = (event: Event) => {
      const target = event.target;

      // Os WebViews podem reportar a rolagem da página no documento,
      // no elemento raiz ou no body, em vez de reportá-la na janela.
      if (
        target === document ||
        target === document.documentElement ||
        target === document.body ||
        target === document.scrollingElement
      ) {
        schedule(window);
        return;
      }

      // Não reage a menus, caixas de diálogo ou áreas independentes.
      // Somente áreas de conteúdo explicitamente marcadas controlam as barras.
      if (
        target instanceof HTMLElement &&
        target.matches("[data-chrome-scroll]")
      ) {
        schedule(target);
      }
    };

    window.addEventListener("scroll", onWindowScroll, { passive: true });
    document.addEventListener("scroll", onDocumentScroll, {
      capture: true,
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", onWindowScroll);
      document.removeEventListener("scroll", onDocumentScroll, true);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [resetKey]);

  return hidden;
}
