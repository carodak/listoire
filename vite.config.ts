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
  // ogl is only reached through lazy imports (dice, react-bits effects). Pre-bundle it so a
  // fresh dev server does not re-optimize and reload the page the first time dice appear.
  optimizeDeps: { include: ["ogl"] },
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
