import { defineConfig, devices } from '@playwright/test';

const PORT = 9640;

export default defineConfig({
  testDir: 'packages/web/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { baseURL: `http://127.0.0.1:${String(PORT)}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: /phone\.spec\.ts/ },
    { name: 'phone', use: { ...devices['Pixel 7'] }, testMatch: /phone\.spec\.ts/ },
  ],
  webServer: {
    command: `npm run build && node packages/web/e2e/serve.ts ${String(PORT)}`,
    url: `http://127.0.0.1:${String(PORT)}/`,
    reuseExistingServer: false,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 2000 },
    timeout: 120_000,
  },
});
