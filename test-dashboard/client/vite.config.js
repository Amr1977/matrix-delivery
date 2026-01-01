import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 3002,
        proxy: {
            '/api': 'http://localhost:4002',
            '/socket.io': {
                target: 'http://localhost:4002',
                ws: true
            }
        }
    }
})
