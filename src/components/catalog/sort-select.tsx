import type { NftSortOption } from '@/api/types/nft'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const sortOptions: Array<{ value: NftSortOption; label: string }> = [
  { value: 'newest', label: 'Listados recentemente' },
  { value: 'price-asc', label: 'Menor preço' },
  { value: 'price-desc', label: 'Maior preço' },
  { value: 'name-asc', label: 'Nome A-Z' },
]

type SortSelectProps = {
  value: NftSortOption
  onChange: (value: NftSortOption) => void
}

export function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <div className="flex items-center justify-end font-mono text-xs font-normal leading-6 text-foreground sm:text-sm">
      <span className="whitespace-nowrap">Ordenar por:</span>
      <Select value={value} onValueChange={(next) => onChange(next as NftSortOption)}>
        <SelectTrigger aria-label="Ordenar por" className="gap-0 rounded-none border-0 p-0 font-normal shadow-none data-[size=default]:h-6">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="font-mono">
          {sortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
