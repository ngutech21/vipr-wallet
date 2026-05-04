import { test, expect } from '@playwright/test'
import { waitForAppReady, waitForHomePageReady } from './utils/app'

const RESTORE_WORDS = [
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'about',
]

test.describe('Startup Restore Flow', () => {
  test('restores mnemonic, shows federation restore step, and allows skipping join codes', async ({
    page,
  }) => {
    await page.goto('/')
    await waitForAppReady(page)

    const installContinueButton = page.getByTestId('startup-wizard-install-next-btn')
    if (
      (await installContinueButton.isVisible().catch(() => false)) &&
      (await installContinueButton.isEnabled().catch(() => false))
    ) {
      await installContinueButton.click()
    }

    await page.getByTestId('startup-wizard-restore-btn').click()

    for (const [index, word] of RESTORE_WORDS.entries()) {
      // Quasar inputs can drop concurrent mobile fills; keep restore word entry deterministic.
      // eslint-disable-next-line no-await-in-loop
      await page.getByTestId(`startup-wizard-restore-word-${index + 1}`).fill(word)
    }

    await page.getByTestId('startup-wizard-restore-submit-btn').click()

    await expect(page.getByTestId('startup-wizard-restore-federations-step')).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.getByTestId('invite-code-input')).toBeVisible()

    await page.getByTestId('startup-wizard-restore-federations-skip-btn').click()

    await waitForHomePageReady(page)
  })
})
