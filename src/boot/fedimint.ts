/* eslint-disable @typescript-eslint/no-unused-vars */
import { useWalletStore } from 'src/stores/wallet'
import { defineBoot } from '#q-app/wrappers'
import { Loading } from 'quasar'

export default defineBoot(async ({ app, router, store }) => {
  Loading.show()
  const walletStore = useWalletStore()
  walletStore.initWallet()
  await walletStore.openWallet()
  Loading.hide()
})
