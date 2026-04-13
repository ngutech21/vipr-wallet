import { dataToFrames } from 'qrloop'

export const ECASH_QR_FRAME_DATA_SIZE = 120
export const ECASH_QR_FRAME_LOOPS = 1
export const ECASH_QR_FRAME_INTERVAL_MS = 300

export function buildEcashQrFrames(
  notes: string,
  dataSize = ECASH_QR_FRAME_DATA_SIZE,
  loops = ECASH_QR_FRAME_LOOPS,
): string[] {
  if (notes.trim() === '') {
    return []
  }

  return dataToFrames(notes, dataSize, loops)
}
