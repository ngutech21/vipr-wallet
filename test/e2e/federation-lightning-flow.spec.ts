import { test, expect } from '@playwright/test'
import { FaucetService } from './utils/FaucetService'
test.setTimeout(120_000)

test.describe('Federation Join and Lightning Payment Flow', () => {
  let faucet: FaucetService

  test.beforeEach(() => {
    faucet = new FaucetService()
  })

  test('join federation and receive lightning payment', async ({ page }) => {
    // Navigate to the app
    await page.goto('/')
    await expect(page).toHaveTitle(/Vipr/)

    // Step 1: Navigate to Federations page
    await test.step('Navigate to Federations page', async () => {
      await page.locator('[data-testid="nav-federations"]').click()
      await expect(page).toHaveURL(/#\/federations$/)
      await expect(page.locator('[data-testid="federations-page"]')).toBeVisible()
    })

    // Step 2: Open Add Federation dialog
    await test.step('Open Add Federation dialog', async () => {
      // Click the FAB button to open federation selection
      await page.locator('[data-testid="add-federation-button"]').click()



      // Wait for the selection dialog to appear
      await page.waitForSelector('[data-testid="join-federation-selection"]', { timeout: 5000 })

      // Click on "Add Federation" option to open the add federation form
      await page.locator('[data-testid="join-trusted-federation-card"]').click()

      // Wait for the form to be visible
      await page.waitForSelector('[data-testid="add-federation-form"]', { timeout: 5000 })


    })

    // Step 3: Join federation using faucet invite code
    await test.step('Join federation with faucet invite code', async () => {
      // Get invite code from faucet
      const inviteCode = await faucet.getInviteCode()
      expect(inviteCode).toBeTruthy()
      expect(inviteCode.length).toBeGreaterThan(10)

      // Fill in the invite code // [data-testid="invite-code-input"]
      const inviteCodeInput = page.locator('[data-testid="invite-code-input"]')
      await inviteCodeInput.fill(inviteCode)

      // Click Add Federation button
      await page.locator('button:has-text("Add Federation")').click()

      // Wait for loading to complete
      await page.waitForSelector('text=Adding Federation', { state: 'hidden', timeout: 30000 })

      // Verify we're back on the federations page with the new federation
      await expect(page.locator('[data-testid="federations-page"]')).toBeVisible()
    })

    // Step 4: Navigate back to home page
    await test.step('Navigate to home page', async () => {
      await page.locator('[data-testid="nav-home"]').click()
      await expect(page).toHaveURL(/#\/$/)
      await expect(page.locator('[data-testid="home-page"]')).toBeVisible()

      // Verify initial balance is 0
      await expect(page.locator('.text-h4')).toContainText('0 sats')

      // Verify federation chip is visible
      await expect(page.locator('.q-chip')).toBeVisible()
    })

    // Step 5: Start receive flow
    await test.step('Start receive flow', async () => {
      // Click Receive button
      await page.locator('button:has-text("Receive")').click()

      // Wait for receive selection dialog
      await page.waitForSelector('text=Receive eCash', { timeout: 5000 })

      // Click on Receive Lightning option
      await page.locator('[data-testid="receive-lightning-card"]').click()

      // Wait for receive page to load
      await page.waitForSelector('[data-testid="amount-input"]', { timeout: 5000 })
    })

    // Step 6: Create invoice for 1000 sats
    let invoice: string
    await test.step('Create invoice for 1000 sats', async () => {
      // Enter amount using keypad
      await page.locator('button:has-text("1")').click()
      await page.locator('button:has-text("0")').click()
      await page.locator('button:has-text("0")').click()
      await page.locator('button:has-text("0")').click()


      // Verify amount is 1000
      const amountInput = page.locator('[data-testid="amount-input"]')
      await expect(amountInput).toHaveValue('1000')

      // Click Create Invoice button
      await page.locator('button:has-text("Create Invoice")').click()

      // Wait for QR code to appear
      await page.waitForSelector('.qr-card', { timeout: 10000 })

      // Extract invoice from the input field
      const invoiceInput = page.locator('.qr-card input[readonly]')
      invoice = await invoiceInput.inputValue()

      expect(invoice).toBeTruthy()
      expect(invoice).toMatch(/^ln[a-z0-9]+/i) // Basic Lightning invoice check
    })

    // // Step 7: Pay invoice using faucet
    await test.step('Pay invoice using faucet', async () => {
      // Pay the invoice using faucet service
      const _paymentResult = await faucet.payFaucetInvoice(invoice)

      // Wait for payment to be processed
      // The app should detect the payment and redirect
      await page.waitForURL('**/#/received-lightning*', { timeout: 60_000 })

      // Wait for success message
      await expect(page.locator('text=Payment Received')).toBeVisible()
      await expect(page.locator('text=1,000 sats')).toBeVisible()
    })

    // Step 8: Verify balance updated
    await test.step('Verify balance updated', async () => {
      // Navigate back to home
      await page.locator('[data-testid="back-home-button"]').click()
      await expect(page).toHaveURL(/#\/$/)

      // Verify balance shows 1000 sats
      await expect(page.locator('.text-h4')).toContainText('1,000 sats')
    })
  })
})
