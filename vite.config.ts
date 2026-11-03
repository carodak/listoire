import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    watch: { ignored: ["**/.fallow/**", "**/assets/**"] },
    proxy: { "/api/narration": { target: "http://127.0.0.1:8765", changeOrigin: true } },
  },
});
