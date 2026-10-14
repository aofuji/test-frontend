import { redirect, type ParsedLocation } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'

import { getSession } from '@/api/auth'
import { queryKeys } from '@/api/queryKeys'

export type AuthRouterContext = {
  ensureSession: (location: ParsedLocation) => Promise<void>
}

export function createAuthRouterContext(
  queryClient: QueryClient,
): AuthRouterContext {
  return {
    ensureSession: async (location) => {
      const session = await queryClient
        .fetchQuery({
          queryKey: queryKeys.auth.session(),
          queryFn: ({ signal }) => getSession(signal),
          staleTime: 0,
          retry: false,
        })
        .catch(() => null)

      if (!session) {
        throw redirect({
          to: '/login',
          search: {
            redirect: getRedirectTarget(location),
          },
        })
      }
    },
  }
}

function getRedirectTarget(location: ParsedLocation) {
  return `${location.pathname}${location.searchStr}${location.hash}`
}

export function sanitizeRedirect(value: string | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/'
  }

  if (value.startsWith('/login') || value.startsWith('/register')) {
    return '/'
  }

  return value
}
