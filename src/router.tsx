import { createRouter } from '@tanstack/react-router'

import type { AuthRouterContext } from './auth/routerAuth'
import { routeTree } from './routeTree.gen'

export type RouterContext = {
  auth: AuthRouterContext
}

export const router = createRouter({
  routeTree,
  context: {
    auth: undefined!,
  } satisfies RouterContext,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
