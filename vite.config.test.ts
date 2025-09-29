import { defineConfig } from 'vite'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait()
  ],
  server: {
    port: 5174,
    open: '/test-wallet.html'
  },
  worker: {
    format: 'es',
    plugins: () => [
      wasm(),
      topLevelAwait()
    ]
  },
  optimizeDeps: {
    exclude: ['@fedimint/core-web'],
    include: []
  },
  build: {
    target: 'esnext'
  }
})