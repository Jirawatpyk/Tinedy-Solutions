import { QueryClient } from '@tanstack/react-query'

/**
 * React Query Client Configuration
 *
 * Optimized for Tinedy CRM:
 * - Caching strategies for different data types
 * - Automatic refetching on window focus
 * - Error retry logic
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache เป็นเวลา 5 นาที (default)
      staleTime: 5 * 60 * 1000,

      // เก็บใน cache 10 นาที หลังจากไม่ได้ใช้งาน
      gcTime: 10 * 60 * 1000,

      // Retry failed queries 2 ครั้ง
      retry: 2,

      // Refetch when window focus (ดีสำหรับ realtime data)
      refetchOnWindowFocus: true,

      // ไม่ต้อง refetch on mount ถ้า data ยังไม่ stale
      refetchOnMount: false,

      // Refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry mutations 1 ครั้งถ้าล้มเหลว
      retry: 1,
    },
  },
})
