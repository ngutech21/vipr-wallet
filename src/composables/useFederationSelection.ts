import { useFederationStore } from 'src/stores/federation'
import { useWalletStore, type OpenWalletOptions } from 'src/stores/wallet'
import type { Federation } from 'src/types/federation'

export async function selectFederationAndOpenWallet(
  federation: Federation | undefined,
  options: OpenWalletOptions = {},
) {
  const federationStore = useFederationStore()
  const walletStore = useWalletStore()
  const previousSelectedFederationId = federationStore.selectedFederationId

  federationStore.selectFederation(federation)

  if (
    previousSelectedFederationId === federationStore.selectedFederationId &&
    walletStore.wallet != null
  ) {
    return
  }

  try {
    await walletStore.openWallet(options)
  } catch (error) {
    federationStore.selectedFederationId = previousSelectedFederationId
    throw error
  }
}

export function useFederationSelection() {
  return {
    selectFederation: selectFederationAndOpenWallet,
  }
}
