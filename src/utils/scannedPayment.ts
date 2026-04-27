import { isBitcoinAddress, parseBitcoinInput, type ParsedBitcoinInput } from 'src/utils/bitcoinUri'

export type ScannedPaymentAction =
  | {
      type: 'add-federation'
      inviteCode: string
    }
  | {
      type: 'send-onchain'
      target: string
    }
  | {
      type: 'choose-bip21-payment'
      bitcoinUri: string
      onchain: ParsedBitcoinInput
      lightningInvoice: string
    }
  | {
      type: 'send-lightning'
      invoice: string
    }
  | {
      type: 'receive-ecash'
      token: string
    }

export function classifyScannedPayment(rawValue: string): ScannedPaymentAction {
  const value = rawValue.trim()
  const normalizedValue = value.toLocaleLowerCase()

  if (normalizedValue.startsWith('fed1')) {
    return {
      type: 'add-federation',
      inviteCode: value,
    }
  }

  if (normalizedValue.startsWith('bitcoin:')) {
    const parsedBitcoinInput = tryParseBitcoinInput(value)

    if (parsedBitcoinInput?.lightning != null) {
      return {
        type: 'choose-bip21-payment',
        bitcoinUri: value,
        onchain: parsedBitcoinInput,
        lightningInvoice: parsedBitcoinInput.lightning,
      }
    }

    return {
      type: 'send-onchain',
      target: value,
    }
  }

  if (isBitcoinAddress(value)) {
    return {
      type: 'send-onchain',
      target: value,
    }
  }

  if (
    normalizedValue.startsWith('ln') ||
    normalizedValue.includes('@') ||
    normalizedValue.startsWith('lightning:') ||
    normalizedValue.startsWith('web+lightning:')
  ) {
    return {
      type: 'send-lightning',
      invoice: stripLightningUriPrefix(normalizedValue),
    }
  }

  return {
    type: 'receive-ecash',
    token: value,
  }
}

function stripLightningUriPrefix(value: string): string {
  if (value.startsWith('web+lightning:')) {
    return value.substring('web+lightning:'.length)
  }

  if (value.startsWith('lightning:')) {
    return value.substring('lightning:'.length)
  }

  return value
}

function tryParseBitcoinInput(value: string): ParsedBitcoinInput | null {
  try {
    return parseBitcoinInput(value)
  } catch {
    return null
  }
}
