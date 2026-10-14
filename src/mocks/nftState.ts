import type { Nft } from '@/api/types/nft'
import type { NftUpdatedEvent } from '@/api/types/realtime'
import { nftFixtures } from './fixtures/nfts'

const key = 'nft-marketplace.nft-state.v1'
type Overrides = Record<string, Partial<Nft>>

export function resetNftState() { localStorage.removeItem(key) }

export function getNfts(): Nft[] {
  let overrides: Overrides = {}
  try { overrides = JSON.parse(localStorage.getItem(key) ?? '{}') as Overrides } catch { resetNftState() }
  return nftFixtures.map((fixture) => ({ ...fixture, ...overrides[fixture.id], editions: overrides[fixture.id]?.editions ?? fixture.editions, version: overrides[fixture.id]?.version ?? 1 }))
}

export function changeNft(input: { nftId: string; editionId?: string; priceEth?: string; available?: boolean; stock?: number }): NftUpdatedEvent | null {
  const nft = getNfts().find((item) => item.id === input.nftId)
  if (!nft) return null
  if (input.editionId && !nft.editions.some((item) => item.id === input.editionId)) return null
  if (input.priceEth !== undefined && (!/^\d+(\.\d+)?$/.test(input.priceEth) || Number(input.priceEth) <= 0)) return null
  if (input.stock !== undefined && (!Number.isInteger(input.stock) || input.stock < 0)) return null
  const editions = nft.editions.map((edition) => edition.id === input.editionId
    ? { ...edition, available: input.stock === 0 ? false : input.available ?? (input.stock !== undefined ? true : edition.available), stock: input.stock ?? edition.stock }
    : edition)
  const next: Nft = {
    ...nft,
    priceEth: input.priceEth ?? nft.priceEth,
    available: input.editionId ? editions.some((edition) => edition.available && (edition.stock ?? 1) > 0) : input.available ?? nft.available,
    version: (nft.version ?? 1) + 1,
    editions,
  }
  let overrides: Overrides = {}
  try { overrides = JSON.parse(localStorage.getItem(key) ?? '{}') as Overrides } catch { /* reset below */ }
  overrides[nft.id] = next
  localStorage.setItem(key, JSON.stringify(overrides))
  return { nftId: nft.id, editionId: input.editionId, priceEth: next.priceEth, available: input.editionId ? next.editions.find((item) => item.id === input.editionId)!.available : next.available, version: next.version! }
}
