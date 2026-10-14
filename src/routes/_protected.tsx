import { Outlet, createFileRoute } from '@tanstack/react-router'

function ProtectedLayout() {
  return <Outlet />
}

export const Route = createFileRoute('/_protected')({
  component: ProtectedLayout,
  // Futuro ponto de guarda:
  // beforeLoad: ({ context }) => ensureAuthenticated(context.session),
})
