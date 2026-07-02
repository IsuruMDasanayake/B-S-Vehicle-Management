import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5174,
    strictPort: true,
    host: true,
    allowedHosts: true,
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: 'http://nginx:80', // In docker, 'nginx' is the service name for backend proxy
        changeOrigin: true,
      }
    }
  },
  build: {
    target: 'es2015'
  },
  preview: {
    allowedHosts: true
  }
})
