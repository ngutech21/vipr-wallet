import { defineBoot } from '#q-app/wrappers'

function isE2EMode(): boolean {
  return import.meta.env.VITE_E2E_MODE === '1'
}

export default defineBoot(() => {
  if (typeof document === 'undefined') {
    return
  }

  if (isE2EMode()) {
    document.documentElement.setAttribute('data-e2e', '1')
  } else {
    document.documentElement.removeAttribute('data-e2e')
  }
})
