import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React dependencies
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI components (Radix UI) - only include installed packages
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-select',
            '@radix-ui/react-toast',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-tabs',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
          ],
          // Charts library
          'vendor-charts': ['recharts'],
          // Supabase client
          'vendor-supabase': ['@supabase/supabase-js'],
          // Form handling
          'vendor-forms': ['react-hook-form', 'zod', '@hookform/resolvers'],
          // Date utilities
          'vendor-date': ['date-fns'],
          // Calendar
          'vendor-calendar': ['react-big-calendar'],
        },
      },
    },
    // Increase chunk size warning limit to 500KB
    chunkSizeWarningLimit: 500,
  },
})
