import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'

type SearchInputProps = {
  value?: string
  onChange: (value?: string) => void
}

export function SearchInput({ value, onChange }: SearchInputProps) {
  return (
    <label className="grid gap-2 text-sm font-medium text-foreground">
      Buscar por nome
      <span className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          className="pl-9"
          value={value ?? ''}
          onChange={(event) => onChange(event.currentTarget.value || undefined)}
          placeholder="Aurora, Neon..."
        />
      </span>
    </label>
  )
}
