import { expect, type Page } from '@playwright/test'

const STARTUP_WIZARD_URL_PATTERN = /#\/startup-wizard\/?$/
const BACKUP_WORDS_URL_PATTERN = /#\/settings\/backup-words\/?$/
const MNEMONIC_BACKUP_CONFIRMED_KEY = 'vipr.fedimint.mnemonic.backup.confirmed'

export async function waitForAppReady(page: Page): Promise<void> {
  await expect(page.locator('[data-app-ready="true"]')).toBeVisible({ timeout: 60_000 })
}

export async function continuePastStartupWizardIfNeeded(page: Page): Promise<void> {
  const createButton = page.getByTestId('startup-wizard-create-btn')
  const onWizardPage = STARTUP_WIZARD_URL_PATTERN.test(page.url())
  const shouldContinueWizard = onWizardPage || (await createButton.isVisible().catch(() => false))

  if (shouldContinueWizard) {
    await expect(createButton).toBeVisible({ timeout: 15_000 })
    await createButton.click()

    const confirmWizardBackupButton = page.getByTestId('startup-wizard-backup-confirm-btn')
    await expect(confirmWizardBackupButton).toBeVisible({ timeout: 20_000 })
    await confirmWizardBackupButton.click()

    await expect
      .poll(
        () =>
          page.evaluate((key) => window.localStorage.getItem(key), MNEMONIC_BACKUP_CONFIRMED_KEY),
        {
          timeout: 20_000,
        },
      )
      .toBe('1')

    await expect(page.getByTestId('home-page')).toBeVisible({ timeout: 20_000 })
    return
  }

  const confirmButton = page.getByTestId('backup-words-confirm-btn')
  const onBackupWordsPage = BACKUP_WORDS_URL_PATTERN.test(page.url())
  const canConfirmBackup = onBackupWordsPage || (await confirmButton.isVisible().catch(() => false))

  if (!canConfirmBackup) {
    return
  }

  await expect(confirmButton).toBeVisible({ timeout: 15_000 })
  await confirmButton.scrollIntoViewIfNeeded()
  await confirmButton.click()

  await expect
    .poll(
      () => page.evaluate((key) => window.localStorage.getItem(key), MNEMONIC_BACKUP_CONFIRMED_KEY),
      {
        timeout: 20_000,
      },
    )
    .toBe('1')

  if (BACKUP_WORDS_URL_PATTERN.test(page.url())) {
    await page.goto('/#/settings')
  }

  await expect(page.getByTestId('settings-page')).toBeVisible({ timeout: 20_000 })
}
