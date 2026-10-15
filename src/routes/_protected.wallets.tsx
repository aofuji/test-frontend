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
import { useSession } from '@/api/hooks/useAuth'
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
import { AccountLayout } from '@/components/account/account-layout'

import './wallets.css'

const emptyForm = {
  label: '',
  address: '',
  network: 'ethereum' as WalletNetwork,
  kind: 'secondary' as WalletKind,
}

function WalletsPage() {
  const sessionQuery = useSession()
  const walletsQuery = useWallets()
  const createWallet = useCreateWallet()
  const updateWallet = useUpdateWallet()
  const [form, setForm] = useState(emptyForm)
  // These presentation fields are intentionally excluded from wallet requests.
  const [presentation, setPresentation] = useState({
    displayName: null as string | null,
    email: null as string | null,
    profileName: '',
    alternateAddress: '',
    referralCode: '',
    ensName: '',
    ensSuffix: '.eth',
  })
  const [sameAsPrimary, setSameAsPrimary] = useState(false)
  const primaryWallet = walletsQuery.data?.find((wallet) => wallet.isDefault)

  function startWalletDraft(copyPrimary = false) {
    setEditingWalletId(null)
    setForm({
      ...emptyForm,
      ...(copyPrimary && primaryWallet ? { address: primaryWallet.address, network: primaryWallet.network } : {}),
    })
    createWallet.reset()
    updateWallet.reset()
    setMessage('')
    document.getElementById('wallet-form-name')?.focus()
  }
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
      <div className="wallets-page"><AccountLayout active="wallets"><section className="wallets-content">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-80" />
      </section></AccountLayout></div>
    )
  }

  return (
    <div className="wallets-page"><AccountLayout active="wallets"><section className="wallets-content">
      <h1 className="sr-only">Gerenciamento de carteiras</h1>
      <div className="wallets-heading">
        <div>
          <h2>Carteira principal</h2>
          <p>Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p>
        </div>
        <Button
          type="button"
          variant="link"
          onClick={() => startWalletDraft()}
        >Adicionar</Button>
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

      <div className="wallets-workspace">

        <Card className="wallets-form-card">
          <CardHeader className={editingWalletId ? 'wallets-edit-heading' : 'sr-only'}>
            <CardTitle>{editingWalletId ? 'Editar carteira' : 'Nova carteira'}</CardTitle>
            <CardDescription>
              Cadastro simulado com validacao de endereco EVM.
            </CardDescription>
          </CardHeader>
          <CardContent className="wallets-form-content">
            <form id="wallet-form" className="wallets-form" onSubmit={handleSubmit}>
              <div className="wallets-form-column wallets-form-left">
                <label className="wallets-field">
                  Nome de exibição
                  <Input value={presentation.displayName ?? sessionQuery.data?.user.name ?? ''} onChange={(event) => setPresentation((current) => ({ ...current, displayName: event.target.value }))} aria-describedby="wallet-local-fields-note" autoComplete="name" />
                </label>
              <label className="wallets-field wallets-network">
                <span>Rede <span className="wallets-required" aria-hidden="true">*</span></span>
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
              <label className="wallets-field wallets-address">
                <span>Endereço da carteira <span className="wallets-required" aria-hidden="true">*</span></span>
                <Input
                  value={form.address}
                  aria-label="Endereço da carteira"
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
              <label className="wallets-field wallets-kind">
                Tipo de carteira
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
                <label className="wallets-field">
                  E-mail
                  <Input type="text" inputMode="email" value={presentation.email ?? sessionQuery.data?.user.email ?? ''} onChange={(event) => setPresentation((current) => ({ ...current, email: event.target.value }))} aria-describedby="wallet-local-fields-note" autoComplete="email" />
                </label>
              </div>
              <div className="wallets-form-column wallets-form-right">
              <label className="wallets-field wallets-name">
                <span>Apelido da carteira <span className="wallets-required" aria-hidden="true">*</span></span>
                <Input
                  id="wallet-form-name"
                  aria-label="Apelido da carteira"
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
                <label className="wallets-field">
                  Nome do perfil
                  <Input value={presentation.profileName} onChange={(event) => setPresentation((current) => ({ ...current, profileName: event.target.value }))} aria-describedby="wallet-local-fields-note" />
                </label>
                <label className="wallets-field">
                  <span className="sr-only">ENS ou carteira secundária (opcional)</span>
                  <Input value={presentation.alternateAddress} onChange={(event) => setPresentation((current) => ({ ...current, alternateAddress: event.target.value }))} placeholder="ENS ou carteira secundária (opcional)" aria-describedby="wallet-local-fields-note" />
                </label>
                <label className="wallets-field">
                  Código de indicação
                  <Input value={presentation.referralCode} onChange={(event) => setPresentation((current) => ({ ...current, referralCode: event.target.value }))} aria-describedby="wallet-local-fields-note" />
                </label>
                <div className="wallets-field">
                  <label htmlFor="wallet-ens-name">Nome ENS</label>
                  <div className="wallets-ens-input">
                    <Select value={presentation.ensSuffix} onValueChange={(ensSuffix) => setPresentation((current) => ({ ...current, ensSuffix }))}>
                      <SelectTrigger aria-label="Sufixo ENS"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value=".eth">.eth</SelectItem></SelectContent>
                    </Select>
                    <Input id="wallet-ens-name" value={presentation.ensName} onChange={(event) => setPresentation((current) => ({ ...current, ensName: event.target.value }))} aria-describedby="wallet-local-fields-note" />
                  </div>
                </div>
              </div>
              <p id="wallet-local-fields-note" className="wallets-local-note">Apelido, rede, endereço e tipo são salvos. Os demais campos ficam apenas nesta tela.</p>
              {message ? (
                <p role={createWallet.error || updateWallet.error ? 'alert' : 'status'} className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                  {message}
                </p>
              ) : null}
              <Button className="wallets-save" disabled={createWallet.isPending || updateWallet.isPending}>
                {createWallet.isPending || updateWallet.isPending ? 'Salvando...' : 'Salvar carteira'}
              </Button>
              {editingWalletId ? (
                <Button type="button" variant="outline" className="w-full" onClick={() => { setEditingWalletId(null); setForm(emptyForm); createWallet.reset(); updateWallet.reset() }}>
                  Cancelar edicao
                </Button>
              ) : null}
            </form>
          </CardContent>
        </Card>
        <div className="wallets-list">
          {(['primary', 'secondary'] as const).map((group) => (
            <section key={group} className={`wallets-group wallets-group-${group}`}>
              <div className="wallets-group-heading">
                <h2>{group === 'primary' ? 'Carteiras cadastradas' : 'Carteira secundária'}</h2>
                {group === 'secondary' ? (
                  <div className="wallets-secondary-actions">
                    <label><input type="checkbox" checked={sameAsPrimary} disabled={!primaryWallet} onChange={(event) => setSameAsPrimary(event.target.checked)} />Igual à carteira principal</label>
                    <Button type="button" variant="link" onClick={() => startWalletDraft(sameAsPrimary)}>Adicionar</Button>
                  </div>
                ) : null}
              </div>
              {group === 'secondary' && sameAsPrimary && primaryWallet ? <p className="wallets-copy-note">Ao adicionar, o rascunho usará o endereço e a rede da carteira principal. Salve para cadastrar a carteira.</p> : null}
              {group === 'secondary' && !walletsQuery.data?.some((wallet) => !wallet.isDefault) ? <p className="wallets-empty-secondary">Você ainda não adicionou uma carteira secundária.</p> : null}
              {(walletsQuery.data ?? []).filter((wallet) => group === 'primary' ? wallet.isDefault : !wallet.isDefault).map((wallet) => (
            <Card key={wallet.id} className="wallets-saved-card">
              <CardContent className="grid gap-4 p-5 sm:grid-cols-[3rem_minmax(0,1fr)] sm:items-start">
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
                  <p className="break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
                    {wallet.address}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 sm:col-span-2">
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
            </section>
          ))}
        </div>

      </div>
    </section></AccountLayout></div>
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
