import { expect, type Page } from '@playwright/test'

const MNEMONIC_BACKUP_CONFIRMED_KEY = 'vipr.fedimint.mnemonic.backup.confirmed'

export async function waitForAppReady(page: Page): Promise<void> {
  await expect(page.locator('[data-app-ready="true"]')).toBeVisible({ timeout: 60_000 })
}

export async function waitForHomePageReady(page: Page): Promise<void> {
  await expect(page).toHaveURL(/#\/$/, { timeout: 20_000 })
  await expect(page.getByTestId('home-page')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('nav-home')).toBeVisible({ timeout: 20_000 })
}

export async function navigateViaFooterTab(
  page: Page,
  tabTestId: string,
  destinationTestId: string,
  urlPattern: RegExp,
): Promise<void> {
  const tab = page.getByTestId(tabTestId)
  const destination = page.getByTestId(destinationTestId)

  await expect(tab).toBeVisible({ timeout: 15_000 })

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await tab.click()

    try {
      await expect(page).toHaveURL(urlPattern, { timeout: 5_000 })
      await expect(destination).toBeVisible({ timeout: 10_000 })
      return
    } catch (error) {
      if (attempt === 1) {
        throw error
      }
    }
  }
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

    await waitForHomePageReady(page)
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
