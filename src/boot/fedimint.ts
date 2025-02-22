/* eslint-disable @typescript-eslint/no-unused-vars */
import { useWalletStore } from 'src/stores/wallet'
import { defineBoot } from '#q-app/wrappers'

export default defineBoot(async ({ app, router, store }) => {
  const walletStore = useWalletStore()
  walletStore.initWallet()
  await walletStore.openWallet()
  console.log('FEDIMINT BOOT end')
})
