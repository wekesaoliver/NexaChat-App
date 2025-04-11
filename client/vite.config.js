import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            "/api": {
                target: "http://localhost:5001", // Your backend server URL
                changeOrigin: true,
                secure: false,
            },
        },
    },
});
