import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results',
  timeout: 480_000, // 8 min — full 10-act platform tour
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,

  use: {
    baseURL: 'https://medos-platform.vercel.app',
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    video: {
      mode: 'on',
      size: { width: 1280, height: 720 },
    },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: {
      slowMo: 300,
    },
  },

  projects: [
    {
      name: 'demo',
      use: {
        browserName: 'chromium',
      },
    },
  ],
});
