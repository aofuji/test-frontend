import type { NftSortOption } from '@/api/types/nft'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const sortOptions: Array<{ value: NftSortOption; label: string }> = [
  { value: 'newest', label: 'Mais recentes' },
  { value: 'price-asc', label: 'Menor preco' },
  { value: 'price-desc', label: 'Maior preco' },
  { value: 'name-asc', label: 'Nome A-Z' },
]

type SortSelectProps = {
  value: NftSortOption
  onChange: (value: NftSortOption) => void
}

export function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <label className="grid gap-2 text-xs font-bold uppercase tracking-wide text-foreground">
      Ordenacao
      <Select value={value} onValueChange={(next) => onChange(next as NftSortOption)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}
