import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5533,
    proxy: {
      "/api": {
        target: "http://localhost:5534",
        changeOrigin: true,
      },
    },
  },
});
