import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api/zenserp": {
        target: "https://app.zenserp.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/zenserp/, ""),
      },
      "/api/pollinations": {
        target: "https://text.pollinations.ai",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/pollinations/, ""),
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
