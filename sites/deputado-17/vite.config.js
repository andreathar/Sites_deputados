import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    // Cloudflare Pages serves from dist/ — keep hashed assets
    assetsInlineLimit: 4096
  },
  server: {
    port: 5173,
    // Proxy API calls to the Pages Function during local dev
    proxy: {
      '/api': 'http://localhost:8788'
    }
  }
})
