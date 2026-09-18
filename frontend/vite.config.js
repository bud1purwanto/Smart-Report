import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('ag-grid-community') || id.includes('ag-grid-react')) return 'ag-grid';
          if (id.includes('@xyflow') || id.includes('/d3-')) return 'query-canvas';
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('zustand')) return 'react-runtime';
          if (id.includes('lucide-react')) return 'icons';
          return undefined;
        },
      },
    },
  }
})
