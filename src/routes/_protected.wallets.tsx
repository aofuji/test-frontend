import { createFileRoute } from '@tanstack/react-router'
import { Plug, PlugZap, WalletCards } from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'

import {
  useCreateWallet,
  useUpdateWallet,
  useWallets,
} from '@/api/hooks/useWallets'
import { ApiError } from '@/api/http/errors'
import type { Wallet, WalletKind, WalletNetwork } from '@/api/types/wallet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

const emptyForm = {
  label: '',
  address: '',
  network: 'ethereum' as WalletNetwork,
  kind: 'secondary' as WalletKind,
}

function WalletsPage() {
  const walletsQuery = useWallets()
  const createWallet = useCreateWallet()
  const updateWallet = useUpdateWallet()
  const [form, setForm] = useState(emptyForm)
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const fieldErrors = (editingWalletId ? updateWallet.error : createWallet.error) instanceof ApiError
    ? ((editingWalletId ? updateWallet.error : createWallet.error) as ApiError).fieldErrors
    : undefined

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')

    try {
      if (editingWalletId) {
        await updateWallet.mutateAsync({ walletId: editingWalletId, payload: form })
        setMessage('Carteira atualizada com sucesso.')
      } else {
        await createWallet.mutateAsync(form)
        setMessage('Carteira conectada com sucesso.')
      }
      setForm(emptyForm)
      setEditingWalletId(null)
    } catch (error) {
      setMessage(getErrorMessage(error))
    }
  }

  async function patchWallet(
    wallet: Wallet,
    payload: Parameters<typeof updateWallet.mutateAsync>[0]['payload'],
  ) {
    setMessage('')

    try {
      await updateWallet.mutateAsync({ walletId: wallet.id, payload })
    } catch (error) {
      setMessage(getErrorMessage(error))
    }
  }

  if (walletsQuery.isLoading) {
    return (
      <section className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-80" />
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          Carteiras
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          Gerenciamento de carteiras
        </h1>
      </div>

      {walletsQuery.error ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <p className="text-muted-foreground">
              {getErrorMessage(walletsQuery.error)}
            </p>
            <Button onClick={() => void walletsQuery.refetch()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {(walletsQuery.data ?? []).map((wallet) => (
            <Card key={wallet.id}>
              <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
                <div className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
                  <WalletCards aria-hidden="true" className="size-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold">{wallet.label}</h2>
                    {wallet.isDefault ? <Badge>Principal</Badge> : null}
                    <Badge variant="outline">{wallet.network}</Badge>
                    <Badge
                      variant={
                        wallet.status === 'connected' ? 'secondary' : 'outline'
                      }
                    >
                      {wallet.status === 'connected' ? 'Conectada' : 'Desconectada'}
                    </Badge>
                  </div>
                  <p className="break-all text-sm text-muted-foreground">
                    {wallet.address}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      createWallet.reset()
                      updateWallet.reset()
                      setEditingWalletId(wallet.id)
                      setForm({
                        label: wallet.label,
                        address: wallet.address,
                        network: wallet.network,
                        kind: wallet.kind,
                      })
                      setMessage('')
                    }}
                  >
                    Editar {wallet.label}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      void patchWallet(wallet, {
                        status:
                          wallet.status === 'connected'
                            ? 'disconnected'
                            : 'connected',
                      })
                    }
                    disabled={updateWallet.isPending}
                  >
                    {wallet.status === 'connected' ? (
                      <Plug className="size-4" aria-hidden="true" />
                    ) : (
                      <PlugZap className="size-4" aria-hidden="true" />
                    )}
                    {wallet.status === 'connected' ? 'Desconectar' : 'Conectar'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void patchWallet(wallet, { isDefault: true })}
                    disabled={wallet.isDefault || updateWallet.isPending}
                  >
                    Definir principal
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() =>
                      void patchWallet(wallet, { scenario: 'connection-declined' })
                    }
                    disabled={updateWallet.isPending}
                  >
                    Simular recusa
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{editingWalletId ? 'Editar carteira' : 'Nova carteira'}</CardTitle>
            <CardDescription>
              Cadastro simulado com validacao de endereco EVM.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="grid gap-2 text-sm font-medium">
                Nome
                <Input
                  value={form.label}
                  aria-invalid={Boolean(fieldErrors?.label)}
                  aria-describedby={fieldErrors?.label ? 'wallet-label-error' : undefined}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      label: event.target.value,
                    }))
                  }
                  placeholder="Carteira de compras"
                />
                {fieldErrors?.label ? <span id="wallet-label-error" className="text-sm text-destructive">{fieldErrors.label}</span> : null}
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Endereco
                <Input
                  value={form.address}
                  aria-invalid={Boolean(fieldErrors?.address)}
                  aria-describedby={fieldErrors?.address ? 'wallet-address-error' : undefined}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                  placeholder="0x..."
                />
                {fieldErrors?.address ? <span id="wallet-address-error" className="text-sm text-destructive">{fieldErrors.address}</span> : null}
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Rede
                <Select
                  value={form.network}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      network: value as WalletNetwork,
                    }))
                  }
                >
                  <SelectTrigger aria-label="Rede da carteira" className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ethereum">Ethereum</SelectItem>
                    <SelectItem value="polygon">Polygon</SelectItem>
                    <SelectItem value="base">Base</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Tipo
                <Select
                  value={form.kind}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      kind: value as WalletKind,
                    }))
                  }
                >
                  <SelectTrigger aria-label="Tipo da carteira" className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Principal</SelectItem>
                    <SelectItem value="secondary">Secundaria</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              {message ? (
                <p role={createWallet.error || updateWallet.error ? 'alert' : 'status'} className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                  {message}
                </p>
              ) : null}
              <Button className="w-full" disabled={createWallet.isPending || updateWallet.isPending}>
                {editingWalletId ? 'Salvar carteira' : 'Conectar carteira'}
              </Button>
              {editingWalletId ? (
                <Button type="button" variant="outline" className="w-full" onClick={() => { setEditingWalletId(null); setForm(emptyForm); createWallet.reset(); updateWallet.reset() }}>
                  Cancelar edicao
                </Button>
              ) : null}
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

function getErrorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : 'Nao foi possivel processar a carteira.'
}

export const Route = createFileRoute('/_protected/wallets')({
  component: WalletsPage,
})
