import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || "/",
  server: {
    proxy: {
      // Forward all /api requests (like /api/fighters) to backend
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // Forward /predict requests to backend
      '/predict': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
