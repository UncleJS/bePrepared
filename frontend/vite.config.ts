import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 9997,
    strictPort: true,
  },
  preview: {
    port: 9997,
    strictPort: true,
  },
  define: {
    // expose VITE_API_URL as import.meta.env.VITE_API_URL (handled by Vite natively)
  },
});
