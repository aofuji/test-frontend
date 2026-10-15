
import { ChevronLeft, ChevronRight } from 'lucide-react'

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

  const pages = Array.from(
    { length: totalPages },
    (_, index) => index + 1,
  )

  const baseClass =
    'flex size-9 shrink-0 items-center justify-center rounded-sm border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'

  return (
    <nav
      aria-label="Paginação do catálogo"
      className="flex w-full flex-wrap items-center justify-end gap-2 pt-6"
    >
      <button
        type="button"
        aria-label="Página anterior"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className={`${baseClass} border-border bg-card text-foreground hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
      </button>

      {pages.map((pageNumber) => {
        const isActive = pageNumber === page

        return (
          <button
            key={pageNumber}
            type="button"
            aria-label={`Ir para a página ${pageNumber}`}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onPageChange(pageNumber)}
            className={`${baseClass} ${
              isActive
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-foreground hover:border-primary hover:text-primary'
            }`}
          >
            {pageNumber}
          </button>
        )
      })}

      <button
        type="button"
        aria-label="Próxima página"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className={`${baseClass} border-border bg-card text-foreground hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <ChevronRight aria-hidden="true" className="size-4" />
      </button>
    </nav>
  )
}
