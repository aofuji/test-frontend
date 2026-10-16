import type { QueryClient } from '@tanstack/react-query'

import { queryKeys } from './queryKeys'
import type { AuthSession } from './types/auth'

type SessionRevision = { userId?: string; expiresAt?: string; revision: number }
const revisions = new WeakMap<QueryClient, SessionRevision>()

// Track transitions, rather than comparing only user IDs when an operation
// finishes: A -> B -> A must not revive a callback from the first A session.
export function capturePrivateSession(queryClient: QueryClient) {
  let current = revisions.get(queryClient)
  if (!current) {
    const session = queryClient.getQueryData<AuthSession | null>(queryKeys.auth.session())
    current = { userId: session?.user.id, expiresAt: session?.expiresAt, revision: 0 }
    revisions.set(queryClient, current)
    const tracked = current
    queryClient.getQueryCache().subscribe(({ query }) => {
      if (query.queryKey.length !== 2 || query.queryKey[0] !== 'auth' || query.queryKey[1] !== 'session') return
      const next = queryClient.getQueryData<AuthSession | null>(queryKeys.auth.session())
      if (next?.user.id !== tracked.userId || next?.expiresAt !== tracked.expiresAt) {
        tracked.userId = next?.user.id
        tracked.expiresAt = next?.expiresAt
        tracked.revision++
      }
    })
  }
  const revision = current.revision
  const tracked = current
  return { isCurrent: () => tracked.revision === revision }
}
