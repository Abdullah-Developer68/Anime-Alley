import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  build: {
    rollupOptions: {
      output: {
        // React, the router and Redux change rarely, so they get their own long-cached file
        manualChunks: (id) => {
          if (/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom|@reduxjs|react-redux|redux|redux-thunk|immer|reselect|use-sync-external-store)\//.test(id))
            return "vendor";
        },
      },
    },
  },
});
