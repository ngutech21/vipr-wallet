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
  const assertNavigationSucceeded = async () => {
    await expect(page).toHaveURL(urlPattern, { timeout: 5_000 })
    await expect(destination).toBeVisible({ timeout: 10_000 })
  }

  await expect(tab).toBeVisible({ timeout: 15_000 })

  try {
    await tab.click()
    await assertNavigationSucceeded()
  } catch {
    await tab.click()
    await assertNavigationSucceeded()
  }
}

export async function continuePastStartupWizardIfNeeded(page: Page): Promise<void> {
  const startupWizardPage = page.getByTestId('startup-wizard-page')
  const createButton = page.getByTestId('startup-wizard-create-btn')
  const doneButton = page.getByTestId('startup-wizard-done-btn')
  const shouldContinueWizard =
    (await startupWizardPage.isVisible().catch(() => false)) ||
    (await createButton.isVisible().catch(() => false)) ||
    (await doneButton.isVisible().catch(() => false))

  if (shouldContinueWizard) {
    const installContinueButton = page.getByTestId('startup-wizard-install-next-btn')
    const shouldContinueInstall =
      (await installContinueButton.isVisible().catch(() => false)) &&
      (await installContinueButton.isEnabled().catch(() => false))

    if (shouldContinueInstall) {
      await installContinueButton.click()
    }

    const canStartCreateFlow = await createButton.isVisible().catch(() => false)

    if (canStartCreateFlow) {
      await createButton.click()

      const skipButton = page.getByTestId('startup-wizard-skip-btn')
      await expect(skipButton).toBeVisible({ timeout: 15_000 })
      await skipButton.click()

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
    }

    await expect(doneButton).toBeVisible({ timeout: 20_000 })
    await doneButton.click()

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
