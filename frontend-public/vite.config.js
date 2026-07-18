import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  base: '/request/',
  server: {
    port: 5174,
    strictPort: true,
    host: true,
    allowedHosts: true,
    watch: {
      usePolling: true,
    }
  },
  build: {
    target: 'es2015'
  },
  preview: {
    allowedHosts: true
  }
})
