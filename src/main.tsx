import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/query-client'
import { BookingRealtimeProvider } from '@/providers/BookingRealtimeProvider'
import './index.css'
import 'react-day-picker/dist/style.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BookingRealtimeProvider>
        <App />
        {/* <ReactQueryDevtools initialIsOpen={false} /> */}
      </BookingRealtimeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
