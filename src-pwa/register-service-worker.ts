import { register } from 'register-service-worker'
import { getActivePinia } from 'pinia'
import { usePwaUpdateStore } from 'src/stores/pwa-update'
import { logger } from 'src/services/logger'

// The ready(), registered(), cached(), updatefound() and updated()
// events passes a ServiceWorkerRegistration instance in their arguments.
// ServiceWorkerRegistration: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration

function withPwaUpdateStore(callback: (store: ReturnType<typeof usePwaUpdateStore>) => void) {
  const pinia = getActivePinia()

  if (pinia == null) {
    logger.pwa.debug('Skipping service worker update hook because Pinia is not active yet')
    return
  }

  callback(usePwaUpdateStore(pinia))
}

register(process.env.SERVICE_WORKER_FILE, {
  // The registrationOptions object will be passed as the second argument
  // to ServiceWorkerContainer.register()
  // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register#Parameter

  // registrationOptions: { scope: './' },

  ready(registration) {
    // Service worker is active
    withPwaUpdateStore((store) => {
      store.bindRegistration(registration)
    })
  },

  registered(registration) {
    // Service worker has been registered
    withPwaUpdateStore((store) => {
      store.bindRegistration(registration)
    })
  },

  cached(registration) {
    // Content has been cached for offline use
    withPwaUpdateStore((store) => {
      store.onCached(registration)
    })
  },

  updatefound(registration) {
    // New content is downloading
    withPwaUpdateStore((store) => {
      store.bindRegistration(registration)
      store.onUpdateFound()
    })
  },

  updated(registration) {
    // Content updated
    withPwaUpdateStore((store) => {
      store.onUpdated(registration)
    })
  },

  offline() {
    // No internet connection found. App is running in offline mode
    withPwaUpdateStore((store) => {
      store.onOffline()
    })
  },

  error(err) {
    // console.error('Error during service worker registration:', err)
    withPwaUpdateStore((store) => {
      store.setError(err, 'registration')
    })
  },
})
