import { useState } from 'react'
import { Slider } from 'radix-ui'

import type { MockScenario, Nft, NftAvailabilityFilter, NftSortOption } from '@/api/types/nft'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { PriceRange } from './use-catalog-nfts'

export type CatalogFilterState = PriceRange & {
  category?: string
  chain?: string
  availability: NftAvailabilityFilter
  sort: NftSortOption
  scenario: MockScenario
}

type FilterPanelProps = {
  value: CatalogFilterState
  onChange: (patch: Partial<CatalogFilterState>) => void
  items: Nft[]
  loading: boolean
  error: boolean
  onRetry: () => void
}

const categoryLabels: Record<string, string> = { art: 'Arte digital', generative: 'Generativa', photography: 'Fotografia', pixel: 'Pixel art' }
const chainLabels: Record<string, string> = { ethereum: 'Ethereum', polygon: 'Polygon', base: 'Base' }
const formatPrice = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 18 })

function countBy(items: Nft[], field: 'category' | 'chain') {
  const counts = new Map<string, number>()
  for (const item of items) counts.set(item[field], (counts.get(item[field]) ?? 0) + 1)
  return [...counts.entries()]
}

export function FilterPanel({ value, onChange, items, loading, error, onRetry }: FilterPanelProps) {
  const prices = items.map((item) => Number(item.priceEth)).filter(Number.isFinite)
  const min = prices.length ? Math.min(...prices) : 0
  const max = prices.length ? Math.max(...prices) : 0
  const decimals = items.reduce((precision, item) => Math.max(precision, item.priceEth.split('.')[1]?.length ?? 0), 0)
  const listClass = 'flex min-h-10 w-full items-center justify-between gap-3 rounded-sm px-3 text-left text-sm text-[#b39463] hover:text-[#d28a4c] focus-visible:outline-2 focus-visible:outline-[#d28a4c] aria-pressed:text-[#d28a4c]'

  return (
    <div className="space-y-8 font-mono text-[#f5f1eb]">
      <section aria-labelledby="collections-filter-title">
        <h3 id="collections-filter-title" className="mb-3 text-lg font-bold">Coleções</h3>
        {loading ? <p role="status" className="text-sm text-[#b39463]">Carregando filtros...</p> : null}
        {error ? <p role="alert" className="text-sm text-[#b39463]">Não foi possível carregar os filtros. <button type="button" onClick={onRetry} className="underline">Tentar novamente</button></p> : null}
        {!loading && !error && !items.length ? <p className="text-sm text-[#b39463]">Nenhuma coleção disponível.</p> : null}
        {countBy(items, 'category').map(([category, count]) => (
          <button key={category} type="button" aria-pressed={value.category === category} className={listClass} onClick={() => onChange({ category: value.category === category ? undefined : category })}>
            <span>{categoryLabels[category] ?? category}</span><span>({count})</span>
          </button>
        ))}
      </section>

      <section aria-labelledby="price-filter-title">
        <h3 id="price-filter-title" className="mb-3 text-lg font-bold">Faixa de preço</h3>
        {prices.length ? <PriceFilter key={`${min}:${max}:${value.minPrice}:${value.maxPrice}`} min={min} max={max} step={10 ** -decimals} value={value} onChange={onChange} /> : <p className="text-sm text-[#b39463]">{loading ? 'Carregando preços...' : 'Nenhum preço disponível.'}</p>}
      </section>

      <section aria-labelledby="chain-filter-title">
        <h3 id="chain-filter-title" className="mb-2 text-lg font-bold">Rede</h3>
        {countBy(items, 'chain').map(([chain, count]) => (
          <button key={chain} type="button" aria-pressed={value.chain === chain} className={listClass} onClick={() => onChange({ chain: value.chain === chain ? undefined : chain })}>
            <span>{chainLabels[chain] ?? chain}</span><span>({count})</span>
          </button>
        ))}
      </section>

      <details className="text-sm text-[#b39463]">
        <summary className="cursor-pointer py-2 focus-visible:outline-2 focus-visible:outline-[#d28a4c]">Disponibilidade</summary>
        <Select value={value.availability} onValueChange={(availability) => onChange({ availability: availability as NftAvailabilityFilter })}>
          <SelectTrigger aria-label="Disponibilidade" className="mt-2 w-full rounded-sm border-[#422d1e] bg-transparent"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="available">Disponíveis</SelectItem>
            <SelectItem value="sold">Vendidos</SelectItem>
          </SelectContent>
        </Select>
      </details>
    </div>
  )
}

function PriceFilter({ min, max, step, value, onChange }: { min: number; max: number; step: number; value: PriceRange; onChange: (range: PriceRange) => void }) {
  const clamp = (price: number) => Math.min(max, Math.max(min, price))
  const [range, setRange] = useState(() => [clamp(value.minPrice ?? min), clamp(value.maxPrice ?? max)].sort((a, b) => a - b))

  return (
    <div>
      {min < max ? (
        <Slider.Root className="relative flex h-8 w-full touch-none select-none items-center" min={min} max={max} step={step} value={range} onValueChange={setRange}>
          <Slider.Track className="relative h-1 w-full grow rounded-full bg-[#422d1e]">
            <Slider.Range className="absolute h-full rounded-full bg-[#d28a4c]" />
          </Slider.Track>
          <Slider.Thumb aria-label="Preço mínimo em ETH" aria-valuetext={`${formatPrice(range[0])} ETH`} className="block size-5 rounded-full border-4 border-[#190f0b] bg-[#d28a4c] outline-none focus-visible:ring-2 focus-visible:ring-[#d28a4c]" />
          <Slider.Thumb aria-label="Preço máximo em ETH" aria-valuetext={`${formatPrice(range[1])} ETH`} className="block size-5 rounded-full border-4 border-[#190f0b] bg-[#d28a4c] outline-none focus-visible:ring-2 focus-visible:ring-[#d28a4c]" />
        </Slider.Root>
      ) : null}
      <p className="my-2 text-sm">Preço: {formatPrice(range[0])} – {formatPrice(range[1])} ETH</p>
      <Button type="button" className="h-10 rounded-sm bg-[#d28a4c] px-3 font-mono text-base font-bold text-[#190f0b] hover:bg-[#d28a4c]/90" onClick={() => onChange({ minPrice: range[0] === min ? undefined : range[0], maxPrice: range[1] === max ? undefined : range[1] })}>Aplicar</Button>
    </div>
  )
}
