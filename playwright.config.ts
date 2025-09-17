import { defineConfig, devices } from '@playwright/test'


const isCI = process.env.CI !== undefined && process.env.CI !== '' && process.env.CI !== 'false'

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './test/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: isCI,
  /* Retry on CI only */
  retries: isCI ? 2 : 0,
  ...(isCI ? { workers: 1 } : {}),
  /* Opt out of parallel tests on CI. */
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://127.0.0.1:9303',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    headless: true,
    ignoreHTTPSErrors: true,

    actionTimeout: 30_000,
    navigationTimeout: 60_000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'BROWSER=none quasar dev -m pwa --port 9303',
    url: 'http://127.0.0.1:9303',
    reuseExistingServer: !isCI,
    //timeout: 180_000, // allow cold Nix start
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
