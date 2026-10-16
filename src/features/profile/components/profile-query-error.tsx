import { Link } from '@tanstack/react-router'
import { RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type ProfileQueryErrorProps = {
  message: string
  expired: boolean
  onRetry: () => void
}

export function ProfileQueryError({ message, expired, onRetry }: ProfileQueryErrorProps) {
  return (
    <Card className="mx-auto max-w-xl"><CardContent className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Nao foi possivel carregar o perfil</h1>
      <p role="alert">{message}</p>
      {expired ? <Button asChild><Link to="/login" search={{ redirect: '/profile' }}>Entrar novamente</Link></Button> : null}
      <Button variant="outline" onClick={onRetry}><RotateCcw aria-hidden="true" /> Tentar novamente</Button>
    </CardContent></Card>
  )
}
