import { date } from 'quasar'

export function useFormatters() {
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat().format(value)
  }

  return {
    formatNumber,
  }
}

export function formatTransactionListTimestamp(timestamp: number, compact = false): string {
  if (!compact) {
    return date.formatDate(timestamp, 'MMM D, YYYY • h:mm A')
  }

  const now = Date.now()
  const time = date.formatDate(timestamp, 'h:mm A')

  if (date.isSameDate(timestamp, now, 'day')) {
    return `Today · ${time}`
  }

  const yesterday = date.subtractFromDate(now, { days: 1 })
  if (date.isSameDate(timestamp, yesterday, 'day')) {
    return `Yesterday · ${time}`
  }

  const dateFormat = date.isSameDate(timestamp, now, 'year') ? 'MMM D' : 'MMM D, YYYY'
  return `${date.formatDate(timestamp, dateFormat)} · ${time}`
}
