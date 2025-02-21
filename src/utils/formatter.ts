export function useFormatters() {
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat().format(value)
  }

  return {
    formatNumber,
  }
}
