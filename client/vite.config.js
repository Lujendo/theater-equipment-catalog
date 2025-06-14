import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    },
    hmr: {
      overlay: false
    }
  },
  build: {
    // Generate source maps for better debugging
    sourcemap: true,
    rollupOptions: {
      // Ensure these dependencies are bundled, not externalized
      external: [],
      output: {
        manualChunks: {
          // Group PDF/Excel libraries together
          'pdf-excel': ['jspdf', 'jspdf-autotable', 'xlsx', 'file-saver']
        }
      }
    }
  }
})
