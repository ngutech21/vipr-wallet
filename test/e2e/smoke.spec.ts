import { test, expect } from '@playwright/test'
import { continuePastStartupWizardIfNeeded, waitForAppReady } from './utils/app'

test.describe('Smoke Tests', () => {
  test('app starts and navigation works', async ({ page }) => {
    // Navigate to the app
    await page.goto('/')
    await waitForAppReady(page)
    await continuePastStartupWizardIfNeeded(page)

    // Wait for the app to load and check that we have the Vipr title
    await expect(page).toHaveTitle(/Vipr/)

    // Verify the footer navigation is visible and contains expected tabs
    await expect(page.getByTestId('nav-home')).toBeVisible()
    await expect(page.getByTestId('nav-federations')).toBeVisible()
    await expect(page.getByTestId('nav-settings')).toBeVisible()

    // Click on the settings tab
    await page.getByTestId('nav-settings').click()

    // Verify we're on the settings page
    await expect(page.getByTestId('settings-page')).toBeVisible()

    // Verify settings page content is loaded
    await expect(page.locator('text=Bitcoin Wallet')).toBeVisible()
    await expect(page.locator('text=Nostr Settings')).toBeVisible()
  })

  test('home navigation works', async ({ page }) => {
    // Start on app root
    await page.goto('/')
    await waitForAppReady(page)
    await continuePastStartupWizardIfNeeded(page)

    // Navigate to settings first
    await page.getByTestId('nav-settings').click()
    await expect(page.getByTestId('settings-page')).toBeVisible()

    // Click home tab
    await page.getByTestId('nav-home').click()

    // Verify we're back to home
    await expect(page.getByTestId('home-page')).toBeVisible()
  })

  test('federations navigation works', async ({ page }) => {
    // Start on home
    await page.goto('/')
    await waitForAppReady(page)
    await continuePastStartupWizardIfNeeded(page)

    // Click federations tab
    await page.getByTestId('nav-federations').click()

    // Verify we're on federations page
    await expect(page.getByTestId('federations-page')).toBeVisible()
  })
})
