import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@codex-ui/shared": fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url))
    }
  },
  server: {
    fs: {
      allow: [fileURLToPath(new URL("../..", import.meta.url))]
    },
    proxy: {
      "/api": "http://127.0.0.1:43110",
      "/ws": {
        target: "ws://127.0.0.1:43110",
        ws: true
      }
    }
  }
});
