import { createFileRoute } from '@tanstack/react-router'

import { useProfile } from '@/api/hooks/useAuth'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSkeleton } from '@/components/shared/loading-skeleton'

function ProfilePage() {
  const profileQuery = useProfile()

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          Perfil
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          Perfil do colecionador
        </h1>
      </div>

      {profileQuery.isLoading ? <LoadingSkeleton variant="detail" /> : null}

      {profileQuery.isError ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-muted-foreground">
            Nao foi possivel carregar o perfil. Sua sessao pode ter expirado.
          </CardContent>
        </Card>
      ) : null}

      {profileQuery.isSuccess ? (
        <Card>
          <CardContent className="grid gap-6 p-6 md:grid-cols-[1fr_280px]">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold">{profileQuery.data.name}</h2>
              <p className="text-muted-foreground">{profileQuery.data.email}</p>
              <p>{profileQuery.data.bio}</p>
              <div className="flex flex-wrap gap-2">
                {profileQuery.data.favoriteCategories.map((category) => (
                  <Badge key={category} variant="secondary">
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border bg-muted/40 p-5">
              <span className="text-sm text-muted-foreground">NFTs coletados</span>
              <p className="mt-1 text-4xl font-semibold">
                {profileQuery.data.totalCollected}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </section>
  )
}

export const Route = createFileRoute('/_protected/profile')({
  component: ProfilePage,
})
