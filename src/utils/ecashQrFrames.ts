import { Buffer } from 'buffer'
import { dataToFrames, framesToData, type State as QrLoopState } from 'qrloop'

export const ECASH_QR_FRAME_DATA_SIZE = 120
export const ECASH_QR_FRAME_LOOPS = 1
export const ECASH_QR_FRAME_INTERVAL_MS = 300
export const ECASH_QR_FRAME_ENCODING = 'utf8'

export function buildEcashQrFrames(
  notes: string,
  dataSize = ECASH_QR_FRAME_DATA_SIZE,
  loops = ECASH_QR_FRAME_LOOPS,
): string[] {
  if (notes.trim() === '') {
    return []
  }

  return dataToFrames(Buffer.from(notes, ECASH_QR_FRAME_ENCODING), dataSize, loops)
}

export function decodeEcashQrFrames(state: QrLoopState): string {
  const data = framesToData(state)
  const text = decodeUtf8(data)

  if (text != null && looksLikeOobNotesString(text)) {
    return text
  }

  return encodeBase64Url(data)
}

function decodeUtf8(data: Uint8Array): string | null {
  try {
    return new TextDecoder(ECASH_QR_FRAME_ENCODING, { fatal: true }).decode(data).trim()
  } catch {
    return null
  }
}

function looksLikeOobNotesString(text: string): boolean {
  return (
    text.startsWith('fedimint') ||
    /^[A-Za-z0-9+/]+={0,2}$/.test(text) ||
    /^[A-Za-z0-9_-]+={0,2}$/.test(text)
  )
}

function encodeBase64Url(data: Uint8Array): string {
  return Buffer.from(data).toString('base64').replace(/\+/g, '-').replace(/\//g, '_')
}
