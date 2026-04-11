import { test, expect } from '@playwright/test'
import {
  continuePastStartupWizardIfNeeded,
  navigateViaFooterTab,
  waitForAppReady,
  waitForHomePageReady,
} from './utils/app'

test.describe('Backup Flow', () => {
  test('shows recovery words and returns to settings after confirmation', async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await continuePastStartupWizardIfNeeded(page)
    await waitForHomePageReady(page)

    await navigateViaFooterTab(page, 'nav-settings', 'settings-page', /#\/settings$/)

    await page.getByTestId('settings-personal-backup-section').click()

    const createBackupButton = page.getByTestId('settings-create-backup-btn')
    await expect(createBackupButton).toBeVisible()
    await createBackupButton.click()

    await expect(page).toHaveURL(/#\/settings\/backup$/)
    await expect(page.getByTestId('backup-intro-page')).toBeVisible()
    await expect(page.getByTestId('backup-intro-title')).toBeVisible()

    const showWordsButton = page.getByTestId('backup-intro-show-words-btn')
    await expect(showWordsButton).toBeVisible()
    await showWordsButton.click()

    await expect(page).toHaveURL(/#\/settings\/backup-words$/)
    await expect(page.getByTestId('backup-words-page')).toBeVisible()

    const backupWordAssertions = Array.from({ length: 12 }, (_, index) => index + 1).flatMap(
      (index) => [
        expect(page.getByTestId(`backup-word-card-${index}`)).toBeVisible(),
        expect(page.getByTestId(`backup-word-${index}`)).not.toHaveText(''),
      ],
    )
    await Promise.all(backupWordAssertions)

    const confirmBackupButton = page.getByTestId('backup-words-confirm-btn')
    await expect(confirmBackupButton).toBeVisible()
    await confirmBackupButton.click()

    await expect(page).toHaveURL(/#\/settings$/)
    await expect(page.getByTestId('settings-page')).toBeVisible()
  })
})
