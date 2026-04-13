import { describe, expect, it } from 'vitest'
import { framesToData, parseFramesReducer } from 'qrloop'
import {
  buildEcashQrFrames,
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

    expect(framesToData(importedFrames).toString()).toBe(notes)
  })

  it('creates multiple frames for longer notes', () => {
    const notes = 'fed1offline-test-notes-'.repeat(20)

    expect(
      buildEcashQrFrames(notes, ECASH_QR_FRAME_DATA_SIZE, ECASH_QR_FRAME_LOOPS).length,
    ).toBeGreaterThan(1)
  })
})
