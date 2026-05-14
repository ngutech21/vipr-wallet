import { test, expect } from '@playwright/test'
import { FaucetService } from './utils/FaucetService'
import {
  continuePastStartupWizardIfNeeded,
  navigateViaFooterTab,
  waitForAppReady,
  waitForHomePageReady,
} from './utils/app'

test.setTimeout(120_000)

test.describe('Federation Join and Onchain Receive Flow', () => {
  let faucet: FaucetService

  test.beforeEach(() => {
    faucet = new FaucetService()
  })

  test('join federation and open onchain receive flow', async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await continuePastStartupWizardIfNeeded(page)
    await waitForHomePageReady(page)
    await expect(page.getByTestId('home-page')).toBeVisible()

    await test.step('Join federation with faucet invite code', async () => {
      await navigateViaFooterTab(page, 'nav-federations', 'federations-page', /#\/federations$/)

      await page.getByTestId('add-federation-button').click()
      await expect(page.getByTestId('join-federation-selection')).toBeVisible({ timeout: 10_000 })

      await page.getByTestId('join-trusted-federation-card').click()
      await expect(page.getByTestId('add-federation-form')).toBeVisible({ timeout: 10_000 })

      const inviteCode = await faucet.getInviteCode()
      expect(inviteCode).toBeTruthy()
      expect(inviteCode.length).toBeGreaterThan(10)

      await page.getByTestId('invite-code-input').fill(inviteCode)

      const previewFederationButton = page.getByTestId('add-federation-preview-btn')
      await expect(previewFederationButton).toHaveAttribute('data-busy', 'false')
      await expect(previewFederationButton).toBeEnabled()
      await previewFederationButton.click()

      await expect(page.getByTestId('join-federation-preview-step')).toBeVisible({
        timeout: 30_000,
      })

      const addFederationButton = page.getByTestId('add-federation-submit-btn')
      await expect(addFederationButton).toHaveAttribute('data-busy', 'false')
      await expect(addFederationButton).toBeEnabled()
      await addFederationButton.click()

      await expect(page.getByTestId('add-federation-form')).toBeHidden({ timeout: 30_000 })
      await expect(page.getByTestId('federations-page')).toBeVisible()

      const federationItem = page.locator('[data-testid^="federation-list-item-"]').first()
      await expect(federationItem).toBeVisible({ timeout: 30_000 })
      await federationItem.click()

      const federationStatus = page.locator('[data-testid^="federation-list-status-"]').first()
      await expect(federationStatus).toHaveText('Active')
    })

    await test.step('Open onchain receive flow', async () => {
      await navigateViaFooterTab(page, 'nav-home', 'home-page', /#\/$/)
      await expect(page.getByTestId('home-selected-federation-chip')).toBeVisible()

      await page.getByTestId('home-receive-btn').click()
      await expect(page.getByTestId('receive-onchain-card')).toBeVisible({ timeout: 10_000 })

      await page.getByTestId('receive-onchain-card').click()

      await expect(page.getByTestId('receive-onchain-page')).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId('receive-onchain-federation-selector-trigger')).toBeVisible({
        timeout: 15_000,
      })

      const addressInput = page.getByTestId('receive-onchain-address-input')
      await expect(addressInput).toBeVisible({ timeout: 30_000 })
      await expect(addressInput).not.toHaveValue('')

      await expect(page.getByTestId('receive-onchain-copy-btn')).toBeVisible()
      await expect(page.getByTestId('receive-onchain-status-text')).toHaveText(
        'Waiting for Bitcoin',
      )
    })
  })
})
