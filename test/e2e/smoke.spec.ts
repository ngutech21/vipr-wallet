import { test, expect } from '@playwright/test'
import {
  continuePastStartupWizardIfNeeded,
  navigateViaFooterTab,
  waitForAppReady,
  waitForHomePageReady,
} from './utils/app'

test.describe('Smoke Tests', () => {
  test('app starts and navigation works', async ({ page }) => {
    // Navigate to the app
    await page.goto('/')
    await waitForAppReady(page)
    await continuePastStartupWizardIfNeeded(page)

    // Avoid title checks; use stable test IDs instead.
    await waitForHomePageReady(page)

    // Verify the footer navigation is visible and contains expected tabs
    await expect(page.getByTestId('nav-home')).toBeVisible()
    await expect(page.getByTestId('nav-federations')).toBeVisible()
    await expect(page.getByTestId('nav-settings')).toBeVisible()

    // Click on the settings tab
    await navigateViaFooterTab(page, 'nav-settings', 'settings-page', /#\/settings$/)

    // Verify settings page content is loaded
    await expect(page.getByTestId('settings-bitcoin-wallet-section')).toBeVisible()
    await expect(page.getByTestId('settings-nostr-section')).toBeVisible()
  })

  test('home navigation works', async ({ page }) => {
    // Start on app root
    await page.goto('/')
    await waitForAppReady(page)
    await continuePastStartupWizardIfNeeded(page)
    await waitForHomePageReady(page)

    // Navigate to settings first
    await navigateViaFooterTab(page, 'nav-settings', 'settings-page', /#\/settings$/)

    // Click home tab
    await navigateViaFooterTab(page, 'nav-home', 'home-page', /#\/$/)
  })

  test('federations navigation works', async ({ page }) => {
    // Start on home
    await page.goto('/')
    await waitForAppReady(page)
    await continuePastStartupWizardIfNeeded(page)
    await waitForHomePageReady(page)

    // Click federations tab
    await navigateViaFooterTab(page, 'nav-federations', 'federations-page', /#\/federations$/)
  })
})
