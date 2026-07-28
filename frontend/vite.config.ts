import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    const appBase = env.VITE_APP_BASE || "/";
    const proxyTarget = env.VITE_API_PROXY_TARGET || "http://127.0.0.1:1240";
    const workspaceV2ProxyTarget =
        env.VITE_WORKSPACE_V2_API_PROXY_TARGET || "http://127.0.0.1:1242";
    const resourceProxyTarget =
        env.VITE_RESOURCE_API_PROXY_TARGET || "http://127.0.0.1:8003";
    const nexusProxyTarget = env.VITE_NEXUS_API_PROXY_TARGET || "http://127.0.0.1:8005";
    const mediaProxyTarget = env.VITE_MEDIA_PROXY_TARGET || "http://127.0.0.1:9000";
    const mediaPathPrefix = `${appBase.replace(/\/$/, "")}/media`.replace(/^\/\//, "/") || "/media";

    return {
        base: appBase,
        plugins: [react(), tailwindcss()],
        resolve: {
            alias: { "@": path.resolve(__dirname, "src") },
            extensions: [".mjs", ".mts", ".ts", ".tsx", ".js", ".jsx", ".json"],
        },
        server: {
            host: "0.0.0.0",
            port: 5173,
            proxy: {
                [mediaPathPrefix]: {
                    target: mediaProxyTarget,
                    changeOrigin: true,
                    rewrite: (path) =>
                        path.replace(new RegExp(`^${mediaPathPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), ""),
                },
                "/api/resource": {
                    target: resourceProxyTarget,
                    changeOrigin: true,
                },
                "/api/video-templates": {
                    target: resourceProxyTarget,
                    changeOrigin: true,
                },
                "/nexus": {
                    target: nexusProxyTarget,
                    changeOrigin: true,
                },
                "/api/ws2": {
                    target: workspaceV2ProxyTarget,
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api\/ws2/, "/api"),
                },
                "/api": {
                    target: proxyTarget,
                    changeOrigin: true,
                },
            },
        },
        build: {
            outDir: "dist",
            emptyOutDir: true,
        },
    };
});