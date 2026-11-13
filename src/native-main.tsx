import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
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

if (Capacitor.isNativePlatform()) {
  void SplashScreen.hide().catch(() => undefined);
}
