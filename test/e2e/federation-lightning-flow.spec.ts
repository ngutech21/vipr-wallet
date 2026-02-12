import { test, expect } from '@playwright/test'
import { FaucetService } from './utils/FaucetService'
import { continuePastBackupWordsIfNeeded, waitForAppReady } from './utils/app'

test.setTimeout(120_000)

test.describe('Federation Join and Lightning Payment Flow', () => {
  let faucet: FaucetService

  test.beforeEach(() => {
    faucet = new FaucetService()
  })

  test('join federation and receive lightning payment', async ({ page }) => {
    // Navigate to the app
    await page.goto('/')
    await waitForAppReady(page)
    await continuePastBackupWordsIfNeeded(page)
    await expect(page).toHaveTitle(/Vipr/)

    // Step 1: Navigate to Federations page
    await test.step('Navigate to Federations page', async () => {
      await page.getByTestId('nav-federations').click()
      await expect(page.getByTestId('federations-page')).toBeVisible()
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

      // Click Add Federation button
      const addFederationButton = page.getByTestId('add-federation-submit-btn')
      await expect(addFederationButton).toHaveAttribute('data-busy', 'false')
      await expect(addFederationButton).toBeEnabled()
      await addFederationButton.click()

      // Verify we're back on the federations page with the new federation
      await expect(page.getByTestId('add-federation-form')).toBeHidden({ timeout: 30_000 })
      await expect(page.getByTestId('federations-page')).toBeVisible()
    })

    // Step 4: Navigate back to home page
    await test.step('Navigate to home page', async () => {
      await page.getByTestId('nav-home').click()
      await expect(page.getByTestId('home-page')).toBeVisible()

      // Verify initial balance is 0
      await expect(page.locator('.text-h4')).toContainText('0 sats')

      // Verify federation chip is visible
      await expect(page.locator('.q-chip')).toBeVisible()
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
      await page.locator('[data-testid^="receive-keypad-btn-"]', { hasText: '1' }).first().click()
      await page.locator('[data-testid^="receive-keypad-btn-"]', { hasText: '0' }).first().click()
      await page.locator('[data-testid^="receive-keypad-btn-"]', { hasText: '0' }).first().click()
      await page.locator('[data-testid^="receive-keypad-btn-"]', { hasText: '0' }).first().click()

      // Verify amount is 1000
      const amountInput = page.getByTestId('amount-input')
      await expect(amountInput).toHaveValue('1000')

      // Click Create Invoice button
      const createInvoiceButton = page.getByTestId('receive-create-invoice-btn')
      await expect(createInvoiceButton).toHaveAttribute('data-busy', 'false')
      await expect(createInvoiceButton).toBeEnabled()
      await createInvoiceButton.click()

      // Wait for QR code to appear
      await expect(page.locator('.qr-card')).toBeVisible({ timeout: 15_000 })

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
      await expect(page.getByTestId('back-home-button')).toBeVisible({ timeout: 60_000 })
      await expect(page.getByText('Payment Received!')).toBeVisible()
      await expect(page.getByText('1,000 sats')).toBeVisible()
    })

    // Step 8: Verify balance updated
    await test.step('Verify balance updated', async () => {
      // Navigate back to home
      await page.getByTestId('back-home-button').click()
      await expect(page.getByTestId('home-page')).toBeVisible({ timeout: 20_000 })

      // Verify balance shows 1000 sats
      await expect(page.locator('.text-h4')).toContainText('1,000 sats')
    })
  })
})
