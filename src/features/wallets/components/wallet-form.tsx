import type { Dispatch, FormEventHandler, SetStateAction } from 'react'

import type { WalletKind, WalletNetwork } from '@/api/types/wallet'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type WalletFormValues = {
  label: string
  address: string
  network: WalletNetwork
  kind: WalletKind
}

type WalletPresentationFields = {
  displayName: string | null
  email: string | null
  profileName: string
  alternateAddress: string
  referralCode: string
  ensName: string
  ensSuffix: string
}

type WalletFormProps = {
  form: WalletFormValues
  setForm: Dispatch<SetStateAction<WalletFormValues>>
  presentation: WalletPresentationFields
  setPresentation: Dispatch<SetStateAction<WalletPresentationFields>>
  userName?: string
  userEmail?: string
  isEditing: boolean
  fieldErrors?: Record<string, string>
  message: string
  messageRole: 'alert' | 'status'
  isSaving: boolean
  onSubmit: FormEventHandler<HTMLFormElement>
  onCancel: () => void
}

export function WalletForm({ form, setForm, presentation, setPresentation, userName, userEmail, isEditing, fieldErrors, message, messageRole, isSaving, onSubmit, onCancel }: WalletFormProps) {
  return (
    <Card className="wallets-form-card">
      <CardHeader className={isEditing ? 'wallets-edit-heading' : 'sr-only'}>
        <CardTitle>{isEditing ? 'Editar carteira' : 'Nova carteira'}</CardTitle>
        <CardDescription>
          Cadastro simulado com validacao de endereco EVM.
        </CardDescription>
      </CardHeader>
      <CardContent className="wallets-form-content">
        <form id="wallet-form" className="wallets-form" onSubmit={onSubmit}>
          <div className="wallets-form-column wallets-form-left">
            <label className="wallets-field">
              Nome de exibição
              <Input value={presentation.displayName ?? userName ?? ''} onChange={(event) => setPresentation((current) => ({ ...current, displayName: event.target.value }))} aria-describedby="wallet-local-fields-note" autoComplete="name" />
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
              <Input type="text" inputMode="email" value={presentation.email ?? userEmail ?? ''} onChange={(event) => setPresentation((current) => ({ ...current, email: event.target.value }))} aria-describedby="wallet-local-fields-note" autoComplete="email" />
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
            <p role={messageRole} className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              {message}
            </p>
          ) : null}
          <Button className="wallets-save" disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar carteira'}
          </Button>
          {isEditing ? (
            <Button type="button" variant="outline" className="w-full" onClick={onCancel}>
              Cancelar edicao
            </Button>
          ) : null}
        </form>
      </CardContent>
    </Card>
  )
}
