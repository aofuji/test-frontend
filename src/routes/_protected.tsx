import { Outlet, createFileRoute } from '@tanstack/react-router'

function ProtectedLayout() {
  return <Outlet />
}

export const Route = createFileRoute('/_protected')({
  component: ProtectedLayout,
  beforeLoad: ({ context, location }) => context.auth.ensureSession(location),
})
