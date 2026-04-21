import { getCurrentInstance } from 'vue'
import * as Quasar from 'quasar'
import type { NamedColor, QNotifyCreateOptions } from 'quasar'

type AppNotifyOptions = Omit<QNotifyCreateOptions, 'message' | 'position' | 'color'>

const DEFAULT_POSITION: NonNullable<QNotifyCreateOptions['position']> = 'top'
const DEFAULT_TIMEOUT = 2600

function getTone(color?: string): 'positive' | 'info' | 'warning' | 'negative' | 'neutral' {
  if (color === 'positive' || color === 'info' || color === 'warning' || color === 'negative') {
    return color
  }

  return 'neutral'
}

function getToneIcon(tone: ReturnType<typeof getTone>): string | undefined {
  switch (tone) {
    case 'positive':
      return 'check_circle'
    case 'info':
      return 'info'
    case 'warning':
      return 'warning'
    case 'negative':
      return 'error'
    default:
      return undefined
  }
}

function buildNotifyPayload(options: QNotifyCreateOptions): QNotifyCreateOptions {
  const tone = getTone(typeof options.color === 'string' ? options.color : undefined)
  const classes = ['vipr-notify', `vipr-notify--${tone}`, options.classes]
    .filter((value) => value != null && value !== '')
    .join(' ')
  const toneIcon = options.icon ?? getToneIcon(tone)

  const payload: QNotifyCreateOptions = {
    timeout: DEFAULT_TIMEOUT,
    textColor: 'white',
    color: 'dark',
    progress: false,
    ...options,
    position: options.position ?? DEFAULT_POSITION,
    classes,
  }

  if (toneIcon != null) {
    payload.icon = toneIcon
  }

  return payload
}

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
      const payload = buildNotifyPayload({
        message: options,
      })

      return quasarNotify?.(payload) ?? fallbackNotify?.(payload)
    }

    const payload = buildNotifyPayload(options)

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
