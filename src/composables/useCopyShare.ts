import { toValue, type MaybeRefOrGetter } from 'vue'
import { useShare } from '@vueuse/core'
import type { QNotifyCreateOptions } from 'quasar'
import { useAppNotify } from 'src/composables/useAppNotify'

type NotifyOptions = Omit<QNotifyCreateOptions, 'message' | 'position' | 'color'>
type MessageFactory = MaybeRefOrGetter<string> | ((error: unknown) => string)

export type CopyShareOptions = {
  value: MaybeRefOrGetter<string>
  copySuccessMessage?: MaybeRefOrGetter<string> | null
  copySuccessOptions?: NotifyOptions
  copyErrorMessage?: MessageFactory | null
  shareTitle?: MaybeRefOrGetter<string>
  shareText?: MaybeRefOrGetter<string>
  shareUnavailableMessage?: MaybeRefOrGetter<string> | null
  onCopyError?: (error: unknown) => void
}

function resolveMessage(message: MessageFactory, error?: unknown): string {
  if (typeof message === 'function') {
    return message(error)
  }

  return toValue(message)
}

function isShareAvailable(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'value' in value &&
    typeof value.value === 'boolean'
  ) {
    return value.value
  }

  return Boolean(toValue(value))
}

export function useCopyShare(options: CopyShareOptions) {
  const notify = useAppNotify()
  const { share, isSupported: isShareSupported } = useShare()

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(toValue(options.value))

      if (options.copySuccessMessage !== null && options.copySuccessMessage !== undefined) {
        notify.success(toValue(options.copySuccessMessage), options.copySuccessOptions)
      }
    } catch (error) {
      options.onCopyError?.(error)

      if (options.copyErrorMessage !== null && options.copyErrorMessage !== undefined) {
        notify.error(resolveMessage(options.copyErrorMessage, error))
      }
    }
  }

  async function shareValue() {
    const text = toValue(options.shareText ?? options.value)

    if (!isShareAvailable(isShareSupported)) {
      await navigator.clipboard.writeText(text)

      if (
        options.shareUnavailableMessage !== null &&
        options.shareUnavailableMessage !== undefined
      ) {
        notify.info(toValue(options.shareUnavailableMessage))
      }
      return
    }

    await share({
      title: toValue(options.shareTitle ?? ''),
      text,
    })
  }

  return {
    copyToClipboard,
    shareValue,
    isShareSupported,
  }
}
