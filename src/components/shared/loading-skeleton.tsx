import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type LoadingSkeletonProps = {
  variant?: 'grid' | 'detail'
  count?: number
  className?: string
}

export function LoadingSkeleton({
  variant = 'grid',
  count = 6,
  className,
}: LoadingSkeletonProps) {
  if (variant === 'detail') {
    return (
      <div className={cn('grid gap-8 lg:grid-cols-[minmax(0,560px)_1fr]', className)}>
        <Skeleton className="aspect-square rounded-3xl" />
        <div className="space-y-5">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-14 w-full max-w-xl" />
          <Skeleton className="h-24 w-full max-w-lg" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid gap-5 sm:grid-cols-2 xl:grid-cols-3',
        className,
      )}
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-3xl border bg-card"
        >
          <Skeleton className="aspect-[4/3] rounded-none" />
          <div className="space-y-4 p-5">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
