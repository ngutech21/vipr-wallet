/* eslint-disable @typescript-eslint/no-unused-vars */
import { useWalletStore } from 'src/stores/wallet'

import { defineBoot } from '#q-app/wrappers'
import { useFederationStore } from 'src/stores/federation'
export default defineBoot(async ({ app, router, store }) => {
  await useFederationStore().loadFederations()
  useFederationStore().loadSelectedFederation()

  const fstore = useWalletStore()
  fstore.initWallet()
  await fstore.openWallet()
  console.log('FEDIMINT BOOT end')
})
