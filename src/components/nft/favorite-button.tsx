import { Heart } from 'lucide-react'
import { useEffect } from 'react'

import { useSession } from '@/api/hooks/useAuth'
import { useFavorites, useSetFavorite } from '@/api/hooks/useFavorites'
import { ApiError } from '@/api/http/errors'
import { Button } from '@/components/ui/button'

const intentKey = 'nft-marketplace.favorite-intent.v1'
type FavoriteIntent = { nftId: string; favorite: boolean; returnTo: string }

function preserveIntent(intent: FavoriteIntent) {
  sessionStorage.setItem(intentKey, JSON.stringify(intent))
  window.location.assign(`/login?redirect=${encodeURIComponent(intent.returnTo)}`)
}

export function FavoriteButton({ nftId, name, showLabel = false }: { nftId: string; name: string; showLabel?: boolean }) {
  const session = useSession()
  const favorites = useFavorites()
  const mutation = useSetFavorite()
  const favorite = favorites.data?.includes(nftId) ?? false
  const userId = session.data?.user.id

  useEffect(() => {
    if (!userId || !favorites.isSuccess) return
    let intent: FavoriteIntent | null = null
    try { intent = JSON.parse(sessionStorage.getItem(intentKey) ?? 'null') as FavoriteIntent | null } catch { sessionStorage.removeItem(intentKey) }
    if (!intent || intent.nftId !== nftId) return
    sessionStorage.removeItem(intentKey)
    mutation.mutate({ nftId, favorite: intent.favorite })
    // The intent is consumed once; the mutation owns subsequent feedback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, favorites.isSuccess, nftId])

  function toggle() {
    mutation.reset()
    const next = !favorite
    if (!userId) {
      preserveIntent({ nftId, favorite: next, returnTo: `${location.pathname}${location.search}${location.hash}` })
      return
    }
    mutation.mutate({ nftId, favorite: next }, {
      onError: (error) => {
        if (error instanceof ApiError && error.status === 401) {
          preserveIntent({ nftId, favorite: next, returnTo: `${location.pathname}${location.search}${location.hash}` })
        }
      },
    })
  }

  const error = mutation.error instanceof ApiError ? mutation.error.message : favorites.error instanceof ApiError ? favorites.error.message : null
  return <div className="flex min-w-0 flex-col items-start gap-1">
    <Button type="button" size={showLabel ? 'default' : 'icon'} className={showLabel ? 'nft-favorite' : undefined} variant={favorite ? 'secondary' : 'outline'} onClick={toggle} disabled={session.isPending || mutation.isPending} aria-pressed={favorite} aria-label={`${favorite ? 'Remover' : 'Adicionar'} ${name} ${favorite ? 'dos' : 'aos'} favoritos`} title={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}>
      <Heart className={favorite ? 'fill-current' : ''} aria-hidden="true" />
      {showLabel ? (favorite ? 'Favoritado' : 'Favoritar') : null}
    </Button>
    {error ? <span role="alert" className="max-w-40 text-xs text-destructive">{error} <button type="button" className="underline" onClick={() => { mutation.reset(); void favorites.refetch() }}>Tentar novamente</button></span> : null}
    {mutation.isSuccess ? <span role="status" className="sr-only">Favoritos atualizados.</span> : null}
  </div>
}
