import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 3000,
    strictPort: true,

    // ВАЖНО: фикс для HMR WS
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 3000,
      clientPort: 3000,
    },
  },
});
