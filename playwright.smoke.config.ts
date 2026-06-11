import { defineConfig, devices } from '@playwright/test';

/**
 * Isolated config for the BLI-103 deterministic parent/admin smoke. Kept
 * separate from playwright.config.ts so it does not affect the existing
 * preview/admin specs. Runs against a Vercel PREVIEW deployment URL only
 * (enforced fail-closed in e2e/support/env.ts). No webServer — the target is a
 * deployed preview, not a local dev server.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.smoke.spec.ts',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  // No Playwright retries: each of the five required runs is a separate attempt
  // so flakes are never hidden by an automatic retry.
  retries: 0,
  forbidOnly: true,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-smoke' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile-390',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
      },
    },
  ],
});
