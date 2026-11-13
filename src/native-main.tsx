import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { Capacitor, SystemBars, SystemBarsStyle } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";
import { SplashScreen } from "@capacitor/splash-screen";
import { getNativeRouter } from "./native-router";
import "./styles.css";

const router = getNativeRouter();
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("O ponto de montagem do Morados não foi encontrado.");
}

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

function scrollFocusedControlAboveKeyboard(keyboardHeight: number) {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return;
  if (!active.matches("input, textarea, select, [contenteditable='true']")) return;

  const visibleBottom = window.innerHeight - keyboardHeight - 18;
  const rect = active.getBoundingClientRect();
  const overflow = rect.bottom - visibleBottom;
  if (overflow <= 0) return;

  let ancestor = active.parentElement;
  while (ancestor && ancestor !== document.body && ancestor !== document.documentElement) {
    const style = window.getComputedStyle(ancestor);
    const canScroll = /(auto|scroll|overlay)/.test(style.overflowY);
    if (canScroll && ancestor.scrollHeight > ancestor.clientHeight + 2) {
      ancestor.scrollBy({ top: overflow, behavior: "smooth" });
      return;
    }
    ancestor = ancestor.parentElement;
  }

  const scrollingElement = document.scrollingElement;
  if (scrollingElement) scrollingElement.scrollBy({ top: overflow, behavior: "smooth" });
}

if (Capacitor.isNativePlatform()) {
  void SystemBars.setStyle({ style: SystemBarsStyle.Dark }).catch(() => undefined);
  void SystemBars.hide().catch(() => undefined);
  void SplashScreen.hide().catch(() => undefined);

  // Com adjustNothing, o teclado fica sobre a WebView. Mantemos o campo ativo
  // visível deslocando apenas o contêiner rolável mais próximo, sem redimensionar
  // novamente a página inteira.
  let keyboardHeight = 0;

  document.addEventListener("focusin", () => {
    if (keyboardHeight > 0) {
      requestAnimationFrame(() => scrollFocusedControlAboveKeyboard(keyboardHeight));
    }
  });

  void Keyboard.addListener("keyboardDidShow", ({ keyboardHeight: height }) => {
    keyboardHeight = Math.max(0, height);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollFocusedControlAboveKeyboard(keyboardHeight));
    });
  }).catch((error) => console.warn("Não foi possível acompanhar o teclado do Android.", error));

  void Keyboard.addListener("keyboardDidHide", () => {
    keyboardHeight = 0;
  }).catch((error) => console.warn("Não foi possível acompanhar o fechamento do teclado.", error));
}
