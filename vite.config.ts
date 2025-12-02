import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core
          if (id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-router')) {
            return 'vendor-react'
          }
          // Radix UI components
          if (id.includes('@radix-ui')) {
            return 'vendor-radix'
          }
          // Charts - recharts is big
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'vendor-recharts'
          }
          // Date utilities
          if (id.includes('date-fns')) {
            return 'vendor-date'
          }
          // Form handling
          if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) {
            return 'vendor-form'
          }
          // Supabase
          if (id.includes('@supabase')) {
            return 'vendor-supabase'
          }
          // Icons
          if (id.includes('lucide-react')) {
            return 'vendor-icons'
          }
        },
      },
    },
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}))
