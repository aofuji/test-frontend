import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getFavorites, setFavorite } from '../favorites'
import { queryKeys } from '../queryKeys'
import type { FavoriteMutation } from '../types/favorites'
import { useSession } from './useAuth'

export function useFavorites() {
  const session = useSession()
  return useQuery({
    queryKey: queryKeys.favorites.list(session.data?.user.id ?? 'anonymous'),
    queryFn: ({ signal }) => getFavorites(signal),
    enabled: Boolean(session.data?.user.id),
    retry: false,
  })
}

export function useSetFavorite() {
  const session = useSession()
  const queryClient = useQueryClient()
  const key = queryKeys.favorites.list(session.data?.user.id ?? 'anonymous')
  return useMutation({
    mutationKey: queryKeys.favorites.all(),
    scope: { id: 'favorites' },
    mutationFn: ({ nftId, favorite, scenario }: FavoriteMutation) => setFavorite(nftId, favorite, scenario),
    onMutate: async ({ nftId, favorite }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<string[]>(key)
      if (previous) queryClient.setQueryData<string[]>(key, favorite
        ? previous.includes(nftId) ? previous : [...previous, nftId]
        : previous.filter((id) => id !== nftId))
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSuccess: (nftIds) => queryClient.setQueryData(key, nftIds),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
