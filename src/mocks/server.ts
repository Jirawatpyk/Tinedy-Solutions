/**
 * MSW Server Setup for Node.js Test Environment
 *
 * This file configures the Mock Service Worker (MSW) server for Vitest tests.
 * MSW intercepts HTTP requests made during tests and returns mocked responses,
 * enabling fast, reliable, and isolated testing without real network calls.
 *
 * Environment: Node.js (Vitest with happy-dom)
 * MSW Version: v2.12.7
 *
 * @see https://mswjs.io/docs/getting-started
 */

import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/**
 * Setup MSW server with registered handlers
 *
 * The server is configured in test setup (src/test/setup.ts) with:
 * - beforeAll: server.listen({ onUnhandledRequest: 'error' })
 * - afterEach: server.resetHandlers()
 * - afterAll: server.close()
 */
export const server = setupServer(...handlers)

/**
 * Optional: Enable request logging for debugging
 * Helps debug which requests are being intercepted by MSW
 * Note: Currently disabled - uncomment to enable logging during test development
 */
// if (import.meta.env.MODE === 'test') {
//   server.events.on('request:start', ({ request }) => {
//     console.log('[MSW] Intercepted:', request.method, request.url)
//   })
// }
