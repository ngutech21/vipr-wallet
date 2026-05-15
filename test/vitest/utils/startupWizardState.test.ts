import { describe, expect, it } from 'vitest'
import {
  addRestoreFederationEntry,
  mapRestoreFederationStatuses,
  normalizeRestoreWords,
  removeRestoreFederationEntry,
  resolveStartupWizardStep,
  type RestoreFederationEntry,
} from 'src/utils/startupWizardState'
import type { Federation } from 'src/types/federation'

const restoreFederation = {
  federationId: 'fed-restore',
  title: 'Restore Federation',
  inviteCode: 'fed11restore',
  modules: [],
} satisfies Federation

describe('startup wizard state helpers', () => {
  it('resolves startup wizard entry points from wallet and onboarding state', () => {
    expect(
      resolveStartupWizardStep(
        { hasMnemonic: true, needsMnemonicBackup: false },
        { flow: 'restore', step: 'restore-federations', status: 'in_progress' },
        false,
      ),
    ).toEqual({ type: 'step', step: 'restore-federations' })

    expect(
      resolveStartupWizardStep(
        { hasMnemonic: true, needsMnemonicBackup: false },
        { flow: null, step: 'welcome', status: 'complete' },
        false,
      ),
    ).toEqual({ type: 'enter-app' })

    expect(
      resolveStartupWizardStep(
        { hasMnemonic: true, needsMnemonicBackup: true },
        { flow: 'create', step: 'backup', status: 'in_progress' },
        false,
      ),
    ).toEqual({ type: 'step', step: 'backup' })

    expect(
      resolveStartupWizardStep(
        { hasMnemonic: false, needsMnemonicBackup: false },
        { flow: 'restore', step: 'restore', status: 'in_progress' },
        false,
      ),
    ).toEqual({ type: 'step', step: 'restore' })
  })

  it('falls back to resumable create, install, then welcome', () => {
    expect(
      resolveStartupWizardStep(
        { hasMnemonic: false, needsMnemonicBackup: false },
        { flow: 'create', step: 'federation', status: 'in_progress' },
        true,
      ),
    ).toEqual({ type: 'step', step: 'federation' })

    expect(
      resolveStartupWizardStep(
        { hasMnemonic: false, needsMnemonicBackup: false },
        { flow: null, step: 'welcome', status: 'complete' },
        true,
      ),
    ).toEqual({ type: 'step', step: 'install' })

    expect(
      resolveStartupWizardStep(
        { hasMnemonic: false, needsMnemonicBackup: false },
        { flow: null, step: 'welcome', status: 'complete' },
        false,
      ),
    ).toEqual({ type: 'step', step: 'welcome' })
  })

  it('normalizes recovery words before restore submission', () => {
    expect(normalizeRestoreWords([' Alpha ', 'BRAVO', 'charlie'])).toEqual([
      'alpha',
      'bravo',
      'charlie',
    ])
  })

  it('maps restore federation entries without duplicating existing federations', () => {
    const entries = addRestoreFederationEntry([], restoreFederation)
    const duplicatedEntries = addRestoreFederationEntry(entries, restoreFederation)

    expect(entries).toEqual([
      {
        federationId: 'fed-restore',
        title: 'Restore Federation',
        inviteCode: 'fed11restore',
      },
    ])
    expect(duplicatedEntries).toEqual(entries)
    expect(duplicatedEntries).not.toBe(entries)
  })

  it('removes restore federation entries immutably', () => {
    const entries = [
      {
        federationId: 'fed-restore',
        title: 'Restore Federation',
        inviteCode: 'fed11restore',
      },
      {
        federationId: 'fed-keep',
        title: 'Keep Federation',
        inviteCode: 'fed11keep',
      },
    ] satisfies RestoreFederationEntry[]

    expect(removeRestoreFederationEntry(entries, 'fed-restore')).toEqual([
      {
        federationId: 'fed-keep',
        title: 'Keep Federation',
        inviteCode: 'fed11keep',
      },
    ])
  })

  it('maps federation recovery status and active recovery errors', () => {
    const entries = [
      {
        federationId: 'fed-restored',
        title: 'Restored Federation',
        inviteCode: 'fed11restored',
      },
      {
        federationId: 'fed-failed',
        title: 'Failed Federation',
        inviteCode: 'fed11failed',
      },
      {
        federationId: 'fed-pending',
        title: 'Pending Federation',
        inviteCode: 'fed11pending',
      },
    ] satisfies RestoreFederationEntry[]

    expect(
      mapRestoreFederationStatuses(entries, {
        recoveryStatusByFederationId: {
          'fed-restored': 'restored',
          'fed-failed': 'failed',
        },
        recoveryFederationId: 'fed-failed',
        recoveryError: 'restore failed',
      }),
    ).toEqual([
      {
        federationId: 'fed-restored',
        title: 'Restored Federation',
        inviteCode: 'fed11restored',
        status: 'restored',
        error: null,
      },
      {
        federationId: 'fed-failed',
        title: 'Failed Federation',
        inviteCode: 'fed11failed',
        status: 'failed',
        error: 'restore failed',
      },
      {
        federationId: 'fed-pending',
        title: 'Pending Federation',
        inviteCode: 'fed11pending',
        status: 'restoring',
        error: null,
      },
    ])
  })
})
