/**
 * Recovery words utilities for wallet backup
 *
 * Note: This is a temporary stub implementation until the Fedimint SDK
 * supports generating actual BIP39 recovery words.
 */

// Placeholder word list for stub implementation
const STUB_WORDS = [
  'vipr',
  'wallet',
  'backup',
  'fedimint',
  'ecash',
  'bitcoin',
  'lightning',
  'privacy',
  'freedom',
  'secure',
  'crypto',
  'network',
  'example',
  'sample',
  'demo',
  'test',
  'mock',
  'stub',
  'alpha',
  'beta',
  'gamma',
  'delta',
  'epsilon',
  'zeta',
]

/**
 * Generate 12 recovery words for wallet backup
 *
 * @returns Array of 12 recovery words
 *
 * @remarks
 * This is a stub implementation that generates placeholder words.
 * Once the Fedimint SDK supports mnemonic generation, this should be
 * replaced with the actual implementation.
 */
export function generateRecoveryWords(): string[] {
  const words: string[] = []

  // Generate 12 random words from the stub word list
  for (let i = 0; i < 12; i++) {
    const randomIndex = Math.floor(Math.random() * STUB_WORDS.length)
    const word = STUB_WORDS[randomIndex]
    if (word !== undefined) {
      words.push(word)
    }
  }

  return words
}
