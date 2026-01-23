import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES modules compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load test environment variables (falls back to .env if .env.test doesn't exist)
const envFile = path.resolve(__dirname, 'tests/.env.test');
const fallbackEnvFile = path.resolve(__dirname, '.env');
dotenv.config({ path: envFile });
if (!process.env.VITE_TEST_MODE) {
  dotenv.config({ path: fallbackEnvFile });
}

/**
 * Playwright Configuration for Tinedy CRM
 *
 * Production-ready E2E test configuration with:
 * - Multi-browser support (Chromium, Firefox, WebKit)
 * - Failure-only artifacts (screenshots, videos, traces)
 * - Environment-based configuration
 * - Parallel execution with worker control
 */
export default defineConfig({
  testDir: './tests/e2e',

  // Global setup (runs once before all tests)
  globalSetup: './tests/setup/global-setup.ts',

  // Test execution settings
  fullyParallel: true, // Run tests in parallel
  forbidOnly: !!process.env.CI, // Fail CI if test.only() is used
  retries: process.env.CI ? 2 : 0, // Retry failed tests in CI
  workers: process.env.CI ? 1 : undefined, // CI: 1 worker, Local: CPU count

  // Timeout settings
  timeout: 60 * 1000, // Test timeout: 60 seconds
  expect: {
    timeout: 15 * 1000, // Assertion timeout: 15 seconds
  },

  // Global test configuration
  use: {
    // Base URL from environment variable or default to localhost
    baseURL: process.env.BASE_URL || 'http://localhost:5173',

    // Action and navigation timeouts
    actionTimeout: 15 * 1000, // Action timeout: 15 seconds
    navigationTimeout: 30 * 1000, // Navigation timeout: 30 seconds

    // Failure artifacts (only on failure to reduce storage)
    trace: 'retain-on-failure', // Trace viewer for debugging
    screenshot: 'only-on-failure', // Screenshots on failure
    video: 'retain-on-failure', // Video recording on failure

    // Browser context options
    viewport: { width: 1280, height: 720 }, // Default viewport
    ignoreHTTPSErrors: true, // Ignore HTTPS errors in dev

    // Supabase may use localStorage for auth
    storageState: undefined, // Start with clean state (auth handled in fixtures)
  },

  // Test reporters
  reporter: [
    ['html', { outputFolder: 'test-results/html' }], // HTML report
    ['junit', { outputFile: 'test-results/junit.xml' }], // JUnit XML for CI
    ['list'], // Console output
  ],

  // Browser projects
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile viewports (optional - uncomment if needed)
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  // Development server (auto-start for tests)
  webServer: {
    // Use --mode test to load .env.test (which sets VITE_USE_MSW=true)
    command: 'npx vite --mode test',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI, // Reuse dev server locally
    timeout: 120 * 1000, // 2 minutes to start
  },

  // Output directories
  outputDir: 'test-results/artifacts',
});
