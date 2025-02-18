//import type { Bolt11Invoice } from 'src/components/models'

declare module 'invoices' {
  export function byteDecodeRequest(invoice: string): Bolt11Invoice

  export function byteEncodeRequest(params: Bolt11Invoice): string
}
