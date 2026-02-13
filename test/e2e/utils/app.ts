import { expect, type Page } from '@playwright/test'

const MNEMONIC_BACKUP_CONFIRMED_KEY = 'vipr.fedimint.mnemonic.backup.confirmed'

export async function waitForAppReady(page: Page): Promise<void> {
  await expect(page.locator('[data-app-ready="true"]')).toBeVisible({ timeout: 60_000 })
}

export async function continuePastStartupWizardIfNeeded(page: Page): Promise<void> {
  const startupWizardPage = page.getByTestId('startup-wizard-page')
  const createRadio = page.getByTestId('startup-wizard-create-radio')
  const shouldContinueWizard =
    (await startupWizardPage.isVisible().catch(() => false)) ||
    (await createRadio.isVisible().catch(() => false))

  if (shouldContinueWizard) {
    await expect(createRadio).toBeVisible({ timeout: 15_000 })
    await createRadio.click()
    await page.getByTestId('startup-wizard-choice-next-btn').click()

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
  const canConfirmBackup = await confirmButton.isVisible().catch(() => false)

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
}
