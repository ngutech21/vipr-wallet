import { test, expect } from '@playwright/test'
import { FaucetService } from './utils/FaucetService'
import {
  continuePastStartupWizardIfNeeded,
  navigateViaFooterTab,
  waitForAppReady,
  waitForHomePageReady,
} from './utils/app'

test.setTimeout(120_000)

function parseSats(text: string): number {
  const digits = text.replace(/[^\d]/g, '')

  return Number.parseInt(digits, 10)
}

test.describe('Federation Join and Lightning Payment Flow', () => {
  let faucet: FaucetService

  test.beforeEach(() => {
    faucet = new FaucetService()
  })

  test('join federation and receive lightning payment', async ({ page }) => {
    let initialBalanceSats = 0

    // Navigate to the app
    await page.goto('/')
    await waitForAppReady(page)
    await continuePastStartupWizardIfNeeded(page)
    await waitForHomePageReady(page)
    // Avoid title checks; use stable test IDs instead.
    await expect(page.getByTestId('home-page')).toBeVisible()

    // Step 1: Navigate to Federations page
    await test.step('Navigate to Federations page', async () => {
      await navigateViaFooterTab(page, 'nav-federations', 'federations-page', /#\/federations$/)
    })

    // Step 2: Open Add Federation dialog
    await test.step('Open Add Federation dialog', async () => {
      // Click the FAB button to open federation selection
      await page.getByTestId('add-federation-button').click()

      // Wait for the selection dialog to appear
      await expect(page.getByTestId('join-federation-selection')).toBeVisible({ timeout: 10_000 })

      // Click on "Add Federation" option to open the add federation form
      await page.getByTestId('join-trusted-federation-card').click()

      // Wait for the form to be visible
      await expect(page.getByTestId('add-federation-form')).toBeVisible({ timeout: 10_000 })
    })

    // Step 3: Join federation using faucet invite code
    await test.step('Join federation with faucet invite code', async () => {
      // Get invite code from faucet
      const inviteCode = await faucet.getInviteCode()
      expect(inviteCode).toBeTruthy()
      expect(inviteCode.length).toBeGreaterThan(10)

      // Fill in the invite code // [data-testid="invite-code-input"]
      const inviteCodeInput = page.getByTestId('invite-code-input')
      await inviteCodeInput.fill(inviteCode)

      // Load preview first
      const previewFederationButton = page.getByTestId('add-federation-preview-btn')
      await expect(previewFederationButton).toHaveAttribute('data-busy', 'false')
      await expect(previewFederationButton).toBeEnabled()
      await previewFederationButton.click()

      await expect(page.getByTestId('join-federation-preview-step')).toBeVisible({
        timeout: 30_000,
      })

      // Confirm join from the preview step
      const addFederationButton = page.getByTestId('add-federation-submit-btn')
      await expect(addFederationButton).toHaveAttribute('data-busy', 'false')
      await expect(addFederationButton).toBeEnabled()
      await addFederationButton.click()

      // Verify we're back on the federations page with the new federation
      await expect(page.getByTestId('add-federation-form')).toBeHidden({ timeout: 30_000 })
      await expect(page.getByTestId('federations-page')).toBeVisible()

      const federationItem = page.locator('[data-testid^="federation-list-item-"]').first()
      await expect(federationItem).toBeVisible({ timeout: 30_000 })
      await federationItem.click()

      const federationStatus = page.locator('[data-testid^="federation-list-status-"]').first()
      await expect(federationStatus).toHaveText('Active')
    })

    // Step 4: Navigate back to home page
    await test.step('Navigate to home page', async () => {
      await navigateViaFooterTab(page, 'nav-home', 'home-page', /#\/$/)

      // Verify initial balance is 0
      const homeBalance = page.getByTestId('home-balance')
      await expect(homeBalance).toContainText('0 sats')
      initialBalanceSats = parseSats(await homeBalance.innerText())

      // Verify the selected federation indicator is visible
      await expect(page.getByTestId('home-selected-federation-chip')).toBeVisible()
    })

    // Step 5: Start receive flow
    await test.step('Start receive flow', async () => {
      // Click Receive button
      await page.getByTestId('home-receive-btn').click()

      // Wait for receive selection dialog
      await expect(page.getByTestId('receive-lightning-card')).toBeVisible({ timeout: 10_000 })

      // Click on Receive Lightning option
      await page.getByTestId('receive-lightning-card').click()

      // Wait for receive page to load
      await expect(page.getByTestId('receive-page')).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId('amount-input')).toBeVisible({ timeout: 15_000 })
    })

    // Step 6: Create invoice for 1000 sats
    let invoice: string
    await test.step('Create invoice for 1000 sats', async () => {
      // Enter amount using keypad
      await page.getByTestId('receive-keypad-btn-1').click()
      await page.getByTestId('receive-keypad-btn-0').click()
      await page.getByTestId('receive-keypad-btn-0').click()
      await page.getByTestId('receive-keypad-btn-0').click()

      // Verify amount is 1000
      const amountDisplay = page.getByTestId('amount-input')
      await expect(amountDisplay).toContainText('1000')

      // Click Create Invoice button
      const createInvoiceButton = page.getByTestId('receive-create-invoice-btn')
      await expect(createInvoiceButton).toHaveAttribute('data-busy', 'false')
      await expect(createInvoiceButton).toBeEnabled()
      await createInvoiceButton.click()

      // Wait for QR code to appear
      await expect(page.getByTestId('receive-qr-container')).toBeVisible({ timeout: 15_000 })

      // Extract invoice from the input field
      const invoiceInput = page.getByTestId('receive-invoice-input')
      invoice = await invoiceInput.inputValue()

      expect(invoice).toBeTruthy()
      expect(invoice).toMatch(/^ln[a-z0-9]+/i) // Basic Lightning invoice check
    })

    // // Step 7: Pay invoice using faucet
    await test.step('Pay invoice using faucet', async () => {
      // Pay the invoice using faucet service
      const _paymentResult = await faucet.payFaucetInvoice(invoice)

      // Wait for success message
      await expect(page.getByTestId('received-lightning-page')).toBeVisible({ timeout: 60_000 })
      await expect(page.getByTestId('received-lightning-success-state')).toBeVisible({
        timeout: 60_000,
      })
      await expect(page.getByTestId('back-home-button')).toBeVisible({ timeout: 60_000 })
      await expect(page.getByTestId('received-lightning-title')).toHaveText('Payment received')
      await expect(page.getByTestId('received-lightning-amount')).toHaveText('1,000 sats')
    })

    // Step 8: Verify balance updated
    await test.step('Verify balance updated', async () => {
      // Navigate back to home
      await page.getByTestId('back-home-button').click()
      await expect(page.getByTestId('home-page')).toBeVisible({ timeout: 20_000 })

      const finalBalance = page.getByTestId('home-balance')
      await expect
        .poll(async () => parseSats(await finalBalance.innerText()), { timeout: 10_000 })
        .toBeGreaterThan(initialBalanceSats)
    })
  })
})
