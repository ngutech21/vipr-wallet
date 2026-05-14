import { describe, expect, it } from 'vitest'
import { Buffer } from 'buffer'
import { dataToFrames, parseFramesReducer } from 'qrloop'
import {
  buildEcashQrFrames,
  decodeEcashQrFrames,
  ECASH_QR_FRAME_DATA_SIZE,
  ECASH_QR_FRAME_LOOPS,
} from 'src/utils/ecashQrFrames'

describe('buildEcashQrFrames', () => {
  it('returns no frames for empty notes', () => {
    expect(buildEcashQrFrames('')).toEqual([])
    expect(buildEcashQrFrames('   ')).toEqual([])
  })

  it('returns deterministic frames for the same notes', () => {
    const notes = 'fed1offline-test-notes-1234567890'

    expect(buildEcashQrFrames(notes)).toEqual(buildEcashQrFrames(notes))
  })

  it('round-trips the original notes payload', () => {
    const notes = 'fed1offline-test-notes-abcdefghijklmnopqrstuvwxyz-0123456789'
    const frames = buildEcashQrFrames(notes)
    const importedFrames = frames.reduce(parseFramesReducer, undefined)

    expect(decodeEcashQrFrames(importedFrames)).toBe(notes)
  })

  it('encodes raw OOB note bytes back to a parseable base64url string', () => {
    const rawOobNotes = Buffer.from([0x03, 0x01, 0x04, 0xff, 0x00, 0x80, 0x1f])
    const frames = dataToFrames(rawOobNotes)
    const importedFrames = frames.reduce(parseFramesReducer, undefined)

    expect(decodeEcashQrFrames(importedFrames)).toBe('AwEE_wCAHw==')
  })

  it('creates multiple frames for longer notes', () => {
    const notes = 'fed1offline-test-notes-'.repeat(20)

    expect(
      buildEcashQrFrames(notes, ECASH_QR_FRAME_DATA_SIZE, ECASH_QR_FRAME_LOOPS).length,
    ).toBeGreaterThan(1)
  })
})
