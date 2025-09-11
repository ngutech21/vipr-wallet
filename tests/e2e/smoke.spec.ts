import { test, expect } from '@playwright/test'

test.describe('Smoke Tests', () => {
  test('app starts and navigation works', async ({ page }) => {
    // Navigate to the app
    await page.goto('/')

    // Wait for the app to load and check that we have the Vipr title
    await expect(page).toHaveTitle(/Vipr/)

    // Verify the footer navigation is visible and contains expected tabs
    await expect(page.locator('[data-testid="nav-home"]')).toBeVisible()
    await expect(page.locator('[data-testid="nav-federations"]')).toBeVisible()
    await expect(page.locator('[data-testid="nav-settings"]')).toBeVisible()

    // Click on the settings tab
    await page.locator('[data-testid="nav-settings"]').click()

    // Verify we're on the settings page
    await expect(page.locator('[data-testid="settings-page"]')).toBeVisible()

    // Verify settings page content is loaded
    await expect(page.locator('text=Bitcoin Wallet')).toBeVisible()
    await expect(page.locator('text=Nostr Settings')).toBeVisible()
  })

  test('home navigation works', async ({ page }) => {
    // Start on settings page
    await page.goto('/settings/')

    // Click home tab
    await page.locator('[data-testid="nav-home"]').click()

    // Verify we're back to home
    await expect(page).toHaveURL(/#\/$/)
    await expect(page.locator('[data-testid="home-page"]')).toBeVisible()
  })

  test('federations navigation works', async ({ page }) => {
    // Start on home
    await page.goto('/')

    // Click federations tab
    await page.locator('[data-testid="nav-federations"]').click()

    // Verify we're on federations page
    await expect(page).toHaveURL(/#\/federations$/)
    await expect(page.locator('[data-testid="federations-page"]')).toBeVisible()
  })
})
