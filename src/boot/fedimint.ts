/* eslint-disable @typescript-eslint/no-unused-vars */
import { useWalletStore } from 'src/stores/wallet'

import { defineBoot } from '#q-app/wrappers'
export default defineBoot(async ({ app, router, store }) => {
  const fstore = useWalletStore()
  fstore.initWallet()

  await fstore.wallet?.initialize()
  await fstore.wallet?.open()
})
