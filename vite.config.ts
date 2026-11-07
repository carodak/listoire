import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { editorLibrary } from "./tools/editor-library.ts";

export default defineConfig({
  base: "./",
  plugins: [react(), editorLibrary()],
  server: {
    watch: { ignored: ["**/.fallow/**", "**/assets/**"] },
    proxy: { "/api/narration": { target: "http://127.0.0.1:8765", changeOrigin: true } },
  },
});
