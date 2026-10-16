import { createFileRoute } from '@tanstack/react-router'
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
import { Button } from '@/components/ui/button'
import { AccountLayout } from '@/components/account/account-layout'
import { WalletForm } from '@/features/wallets/components/wallet-form'
import { WalletList } from '@/features/wallets/components/wallet-list'
import { WalletsQueryError, WalletsSkeleton } from '@/features/wallets/components/wallet-states'

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

  function editWallet(wallet: Wallet) {
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
  }

  function cancelEditing() {
    setEditingWalletId(null)
    setForm(emptyForm)
    createWallet.reset()
    updateWallet.reset()
  }

  function toggleWalletConnection(wallet: Wallet) {
    void patchWallet(wallet, {
      status: wallet.status === 'connected' ? 'disconnected' : 'connected',
    })
  }

  function setPrimaryWallet(wallet: Wallet) {
    void patchWallet(wallet, { isDefault: true })
  }

  function simulateConnectionDecline(wallet: Wallet) {
    void patchWallet(wallet, { scenario: 'connection-declined' })
  }

  if (walletsQuery.isLoading) {
    return (
      <div className="wallets-page"><AccountLayout active="wallets"><section className="wallets-content">
        <WalletsSkeleton />
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
        <WalletsQueryError message={getErrorMessage(walletsQuery.error)} onRetry={() => void walletsQuery.refetch()} />
      ) : null}

      <div className="wallets-workspace">

        <WalletForm
          form={form}
          setForm={setForm}
          presentation={presentation}
          setPresentation={setPresentation}
          userName={sessionQuery.data?.user.name}
          userEmail={sessionQuery.data?.user.email}
          isEditing={Boolean(editingWalletId)}
          fieldErrors={fieldErrors}
          message={message}
          messageRole={createWallet.error || updateWallet.error ? 'alert' : 'status'}
          isSaving={createWallet.isPending || updateWallet.isPending}
          onSubmit={handleSubmit}
          onCancel={cancelEditing}
        />
        <WalletList
          wallets={walletsQuery.data}
          primaryWallet={primaryWallet}
          sameAsPrimary={sameAsPrimary}
          setSameAsPrimary={setSameAsPrimary}
          startWalletDraft={startWalletDraft}
          isUpdating={updateWallet.isPending}
          onEdit={editWallet}
          onToggleConnection={toggleWalletConnection}
          onSetPrimary={setPrimaryWallet}
          onSimulateDecline={simulateConnectionDecline}
        />

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
