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
          // Separate vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],

          // Charts library (large - ~120kb)
          'charts': ['recharts'],

          // Admin pages - split large pages
          'admin-reports': ['./src/pages/admin/reports'],
          'admin-calendar': ['./src/pages/admin/calendar'],
          'admin-customer-detail': ['./src/pages/admin/customer-detail'],

          // Booking components - frequently used together
          'booking-components': [
            './src/components/booking/BookingCreateModal',
            './src/components/booking/BookingEditModal',
            './src/components/booking/staff-availability-modal',
            './src/components/booking/quick-availability-check',
          ],

          // Dashboard components
          'dashboard-components': [
            './src/components/dashboard/RevenueChart',
            './src/components/dashboard/BookingStatusChart',
            './src/components/dashboard/TodayAppointments',
          ],
        },
      },
    },
    // Increase chunk size warning limit since we're intentionally splitting
    chunkSizeWarningLimit: 600,
  },
})
