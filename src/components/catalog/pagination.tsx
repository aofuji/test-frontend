import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

type PaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  return (
    <nav
      className="flex flex-col items-center justify-between gap-3 border-t border-border pt-5 sm:flex-row"
      aria-label="Paginacao"
    >
      <Button
        type="button"
        variant="outline"
        className="rounded-sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft aria-hidden="true" />
        Anterior
      </Button>
      <span className="text-sm text-muted-foreground">
        Pagina {page} de {totalPages}
      </span>
      <Button
        type="button"
        variant="outline"
        className="rounded-sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Proxima
        <ChevronRight aria-hidden="true" />
      </Button>
    </nav>
  )
}
