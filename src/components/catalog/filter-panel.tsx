import type {
  MockScenario,
  NftAvailabilityFilter,
  NftSortOption,
} from '@/api/types/nft'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type CatalogFilterState = {
  category?: string
  chain?: string
  availability: NftAvailabilityFilter
  sort: NftSortOption
  scenario: MockScenario
}

type FilterPanelProps = {
  value: CatalogFilterState
  onChange: (patch: Partial<CatalogFilterState>) => void
}

const categories = [
  { value: 'all', label: 'Todas categorias' },
  { value: 'art', label: 'Arte' },
  { value: 'generative', label: 'Generativo' },
  { value: 'photography', label: 'Fotografia' },
  { value: 'pixel', label: 'Pixel art' },
]

const chains = [
  { value: 'all', label: 'Todas redes' },
  { value: 'ethereum', label: 'Ethereum' },
  { value: 'polygon', label: 'Polygon' },
  { value: 'base', label: 'Base' },
]

const availabilityOptions: Array<{
  value: NftAvailabilityFilter
  label: string
}> = [
  { value: 'all', label: 'Todos' },
  { value: 'available', label: 'Disponiveis' },
  { value: 'sold', label: 'Vendidos' },
]

export function FilterPanel({ value, onChange }: FilterPanelProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
      <FilterSelect
        label="Categoria"
        value={value.category ?? 'all'}
        options={categories}
        onChange={(next) =>
          onChange({ category: next === 'all' ? undefined : next })
        }
      />
      <FilterSelect
        label="Rede"
        value={value.chain ?? 'all'}
        options={chains}
        onChange={(next) => onChange({ chain: next === 'all' ? undefined : next })}
      />
      <FilterSelect
        label="Disponibilidade"
        value={value.availability}
        options={availabilityOptions}
        onChange={(next) =>
          onChange({ availability: next as NftAvailabilityFilter })
        }
      />
    </div>
  )
}

type FilterSelectProps = {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}

function FilterSelect({ label, value, options, onChange }: FilterSelectProps) {
  return (
    <label className="grid gap-2 text-xs font-semibold tracking-wide text-foreground">
      {label}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full rounded-sm border-border/80 bg-background/40 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}
