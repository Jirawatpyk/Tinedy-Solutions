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
        manualChunks(id) {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor'
            }
            // Remove Supabase vendor splitting to avoid initialization issues
            // if (id.includes('@supabase')) {
            //   return 'supabase-vendor'
            // }
            if (id.includes('recharts')) {
              return 'charts'
            }
          }

          // Admin pages
          if (id.includes('src/pages/admin/reports')) {
            return 'admin-reports'
          }
          if (id.includes('src/pages/admin/calendar')) {
            return 'admin-calendar'
          }
          if (id.includes('src/pages/admin/customer-detail')) {
            return 'admin-customer-detail'
          }

          // Booking components
          if (id.includes('src/components/booking/')) {
            return 'booking-components'
          }

          // Dashboard components
          if (id.includes('src/components/dashboard/')) {
            return 'dashboard-components'
          }
        },
      },
    },
    // Increase chunk size warning limit since we're intentionally splitting
    chunkSizeWarningLimit: 600,
  },
})
