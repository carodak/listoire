import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { editorLibrary } from "./tools/editor-library.ts";

/** All local voice synthesis stays on loopback. Never proxy narration in a public build. */
export default defineConfig({
  plugins: [
    react(),
    ...(existsSync(resolve(process.cwd(), "assets/catalog/curated.json")) ? [editorLibrary] : []),
  ],
  // Reached only through lazy imports or the compile worker, which Vite's startup scan
  // misses: ogl (dice, react-bits effects) and inkjs/full (editor compiler). Pre-bundle them
  // so a fresh dev server does not re-optimize and invalidate in-flight imports mid-page.
  optimizeDeps: { include: ["ogl", "inkjs/full"] },
  server: {
    host: "127.0.0.1",
    proxy: {
      "/api/narration": {
        target: "http://127.0.0.1:8765",
        changeOrigin: true,
      },
    },
  },
});
