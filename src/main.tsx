import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'

import './index.css'
import { queryClient } from './api/queryClient'
import { createAuthRouterContext } from './auth/routerAuth'
import { enableMocking } from './mocks/start'
import { router } from './router'

const auth = createAuthRouterContext(queryClient)

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} context={{ auth }} />
      </QueryClientProvider>
    </StrictMode>,
  )
})
