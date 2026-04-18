import { getCurrentInstance } from 'vue'
import * as Quasar from 'quasar'
import type { NamedColor, QNotifyCreateOptions } from 'quasar'

type AppNotifyOptions = Omit<QNotifyCreateOptions, 'message' | 'position' | 'color'>

const DEFAULT_POSITION: NonNullable<QNotifyCreateOptions['position']> = 'top'

export function useAppNotify() {
  const vm = getCurrentInstance()
  const proxyNotify = vm?.proxy?.$q?.notify as
    | ((options: QNotifyCreateOptions | string) => unknown)
    | undefined
  let fallbackNotify: ((options: QNotifyCreateOptions | string) => unknown) | null = null

  try {
    const notifyPlugin = (Quasar as Record<string, unknown>).Notify as
      | { create?: (options: QNotifyCreateOptions | string) => unknown }
      | undefined

    if (typeof notifyPlugin?.create === 'function') {
      fallbackNotify = notifyPlugin.create.bind(notifyPlugin)
    }
  } catch {
    fallbackNotify = null
  }
  const injectedNotify =
    proxyNotify == null && fallbackNotify == null && typeof Quasar.useQuasar === 'function'
      ? (() => {
          try {
            return Quasar.useQuasar().notify as
              | ((options: QNotifyCreateOptions | string) => unknown)
              | undefined
          } catch {
            return undefined
          }
        })()
      : undefined
  const quasarNotify = proxyNotify ?? injectedNotify

  function notify(options: QNotifyCreateOptions | string) {
    if (typeof options === 'string') {
      const payload = {
        message: options,
        position: DEFAULT_POSITION,
      }

      return quasarNotify?.(payload) ?? fallbackNotify?.(payload)
    }

    if (options.position != null) {
      return quasarNotify?.(options) ?? fallbackNotify?.(options)
    }

    const payload = {
      ...options,
      position: DEFAULT_POSITION,
    }

    return quasarNotify?.(payload) ?? fallbackNotify?.(payload)
  }

  function success(message: string, options: AppNotifyOptions = {}) {
    return notify({
      color: 'positive' satisfies NamedColor,
      message,
      ...options,
    })
  }

  function info(message: string, options: AppNotifyOptions = {}) {
    return notify({
      color: 'info' satisfies NamedColor,
      message,
      ...options,
    })
  }

  function warning(message: string, options: AppNotifyOptions = {}) {
    return notify({
      color: 'warning' satisfies NamedColor,
      message,
      ...options,
    })
  }

  function error(message: string, options: AppNotifyOptions = {}) {
    return notify({
      color: 'negative' satisfies NamedColor,
      message,
      ...options,
    })
  }

  return {
    notify,
    success,
    info,
    warning,
    error,
  }
}
