import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  configFile: false,
  root: process.cwd(),
  base: "./",
  publicDir: "public",
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  build: {
    outDir: "dist-native",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      // Capacitor has its own document; keep the TanStack Start project free of a root index.html.
      input: "native.html",
    },
  },
});
