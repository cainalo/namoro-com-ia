// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// Never set ssr.external or resolve.external: the Worker has no runtime module resolution,
// so the build fails. Never add compression: hosting already compresses at the edge.
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Netlify sets NETLIFY=true during production builds. Override only Nitro's deployment
// target there; keep the Lovable preview's existing default target unchanged.
const isNetlifyBuild = process.env.NETLIFY === "true";

export default defineConfig({
  ...(isNetlifyBuild ? { nitro: { preset: "netlify" } } : {}),
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    server: { entry: "server" },
  },
});
