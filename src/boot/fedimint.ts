/* eslint-disable @typescript-eslint/no-unused-vars */
import { useFedimintStore } from 'src/stores/fedimint'

import { defineBoot } from '#q-app/wrappers'
export default defineBoot(async ({ app, router, store }) => {
  const fstore = useFedimintStore()
  fstore.initWallet()

  await fstore.wallet?.initialize()
  await fstore.wallet?.open()
})
