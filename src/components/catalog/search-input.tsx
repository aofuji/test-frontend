import { Input } from '@/components/ui/input'
import searchIcon from '../../../design-reference/Mobile /Search.svg'

type SearchInputProps = {
  value?: string
  onChange: (value?: string) => void
}

export function SearchInput({ value, onChange }: SearchInputProps) {
  return (
    <label className="grid gap-2 text-xs font-bold uppercase tracking-wide text-foreground">
      Explorar coleções
      <span className="relative">
        <img src={searchIcon} alt="" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          aria-label="Buscar por nome"
          className="h-10 rounded-sm border-primary/25 bg-card pl-10 normal-case tracking-normal"
          value={value ?? ''}
          onChange={(event) => onChange(event.currentTarget.value || undefined)}
          placeholder="Aurora, Neon..."
        />
      </span>
    </label>
  )
}
