import type { PaymentStatus } from './order'

export type NftUpdatedEvent = {
  nftId: string
  editionId?: string
  priceEth: string
  available: boolean
  version: number
}

export type OrderUpdatedEvent = {
  orderId: string
  userId: string
  status: PaymentStatus
  version: number
}
