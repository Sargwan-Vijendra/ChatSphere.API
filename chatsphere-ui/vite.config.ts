import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 62047,
        proxy: {
            '/api': {
                target: 'https://localhost:7168',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/api/, '/api')
            },
            '/chathub': {
                target: 'https://localhost:7168',
                changeOrigin: true,
                secure: false,
                ws: true
            }
        }
    }
})