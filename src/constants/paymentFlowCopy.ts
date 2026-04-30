import { MIN_ONCHAIN_SEND_SATS, ONCHAIN_FEE_RESERVE_SATS } from 'src/utils/onchainPolicy'

export const paymentFlowCopy = {
  receiveLightning: {
    bottomHint: 'Creates a Lightning invoice for this federation.',
    submitLabel: 'Create Invoice',
  },
  receiveEcash: {
    emptyHint: 'Paste or scan ecash to detect its federation.',
    joinedHint: 'Redeems ecash into its issuing federation.',
    joinRequiredHint: 'This ecash requires joining its federation before redeeming.',
    submitLabel: 'Receive ecash',
  },
  sendLightning: {
    inputHint: 'Enter a Lightning invoice, address, or contact.',
    reviewHint: 'Review the payment details before sending.',
    continueLabel: 'Continue',
    reviewLabel: 'Review payment',
  },
  sendOnchain: {
    submitLabel: 'Send Bitcoin',
    bottomHint(maxSendAmount: number) {
      return `A ${ONCHAIN_FEE_RESERVE_SATS.toLocaleString()} sat fee reserve is kept for network fees. Minimum on-chain send: ${MIN_ONCHAIN_SEND_SATS.toLocaleString()} sats. Maximum spendable now: ${maxSendAmount.toLocaleString()} sats.`
    },
    uriAmountHint(amountSats: number) {
      return `Using ${amountSats.toLocaleString()} sats from the Bitcoin URI`
    },
  },
  sendEcash: {
    submitLabel: 'Export ecash',
    denominationHint: 'Exact offline amounts depend on your current note denominations.',
    selectFederationHint: 'Select a federation to export offline ecash.',
  },
} as const
