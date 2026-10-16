import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function WalletsSkeleton() {
  return (
    <>
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-80" />
    </>
  )
}

export function WalletsQueryError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <p className="text-muted-foreground">
          {message}
        </p>
        <Button onClick={onRetry}>
          Tentar novamente
        </Button>
      </CardContent>
    </Card>
  )
}
