import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    plugins: [react(), tailwindcss()],
    server: {
      port: 3000,
      host: true,
      proxy: {
        // Proxy /api/dspace to the DSpace backend
        "/api/dspace": {
          target: env.DSPACE_API_URL || "http://localhost:8080",
          changeOrigin: false,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/dspace/, "/server/api"),
          configure: (proxy, _options) => {
            proxy.on("proxyRes", (proxyRes, req, res) => {
              const setCookie = proxyRes.headers["set-cookie"];
              if (setCookie) {
                proxyRes.headers["set-cookie"] = setCookie.map((cookie) => {
                  return cookie.replace(/Path=\/server/gi, "Path=/");
                });
              }
            });
          },
        },
        // Proxy other /api calls to the Django backend
        "/api": {
          target: env.DJANGO_API_URL || "http://localhost:8000",
          changeOrigin: true,
          secure: false,
        },
        // Proxy /media calls to the Django backend
        "/media": {
          target: env.DJANGO_API_URL || "http://localhost:8000",
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
