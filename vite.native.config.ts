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
      input: "native.html",
    },
  },
});
