/**
 * Playwright Global Setup
 *
 * Story: 3.3 - Setup Playwright for E2E Testing (Re-opened)
 *
 * Runs once before all tests to initialize test environment.
 * Sets up MSW service worker for mocking Supabase API.
 *
 * Usage:
 * Configured in playwright.config.ts via `globalSetup` property.
 */

import type { FullConfig } from '@playwright/test'
import path from 'path'
import fs from 'fs'

/**
 * Global setup function
 *
 * This runs once before all tests.
 * Generates MSW service worker file for browser mocking.
 */
export default async function globalSetup(_config: FullConfig) {
  console.log('🔧 Playwright Global Setup: Initializing test environment...')

  // Generate MSW service worker file
  await generateMswServiceWorker()

  // Start dev server (handled by webServer config in playwright.config.ts)
  // No action needed here - Playwright starts it automatically

  console.log('✅ Playwright Global Setup: Complete')
}

/**
 * Generate MSW service worker file
 *
 * Creates mockServiceWorker.js in public/ directory.
 * This file is loaded by the browser to enable MSW interception.
 */
async function generateMswServiceWorker() {
  const publicDir = path.join(process.cwd(), 'public')
  const workerPath = path.join(publicDir, 'mockServiceWorker.js')

  // Ensure public directory exists
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }

  // Check if worker file already exists
  if (fs.existsSync(workerPath)) {
    console.log('   MSW service worker already exists:', workerPath)
    return
  }

  console.log('   Generating MSW service worker...')

  // Use MSW CLI to generate worker file
  // This is equivalent to: npx msw init public/ --save
  const { exec } = await import('child_process')
  const { promisify } = await import('util')
  const execAsync = promisify(exec)

  try {
    await execAsync('npx msw init public/ --save')
    console.log('   ✓ MSW service worker generated')
  } catch (error) {
    console.error('   ✗ Failed to generate MSW service worker:', error)
    throw error
  }
}
