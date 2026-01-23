import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/query-client'
import './index.css'
import 'react-day-picker/dist/style.css'
import App from './App.tsx'

/**
 * Initialize MSW for E2E testing if enabled
 *
 * When VITE_USE_MSW=true (E2E test mode), MSW intercepts Supabase API
 * calls and returns mock responses. This allows E2E tests to run without
 * a real backend.
 */
async function prepare() {
  console.log('[main.tsx] VITE_USE_MSW =', import.meta.env.VITE_USE_MSW)

  if (import.meta.env.VITE_USE_MSW === 'true') {
    console.log('[main.tsx] MSW enabled - initializing...')
    const { initializeMSW } = await import('./mswBrowser')
    return initializeMSW()
  }

  console.log('[main.tsx] MSW disabled - using real Supabase')
  return Promise.resolve()
}

prepare().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
        {/* <ReactQueryDevtools initialIsOpen={false} /> */}
      </QueryClientProvider>
    </StrictMode>,
  )
})
