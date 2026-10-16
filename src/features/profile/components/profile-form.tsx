import { Link } from '@tanstack/react-router'
import { UserRound } from 'lucide-react'
import type { ChangeEventHandler, FormEventHandler, RefObject } from 'react'

import type { ChangePasswordRequest, UpdateProfileRequest, UserProfile } from '@/api/types/auth'
import type { Wallet } from '@/api/types/wallet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TextField } from './profile-text-field'

const categories = [
  { id: 'art', label: 'Arte' },
  { id: 'generative', label: 'Generativo' },
  { id: 'photography', label: 'Fotografia' },
  { id: 'pixel', label: 'Pixel art' },
]

type ProfileFormProps = {
  profile: UserProfile
  form: UpdateProfileRequest
  password: ChangePasswordRequest
  primaryWallet?: Wallet
  walletsPending: boolean
  walletsError: boolean
  errors: Record<string, string>
  secretErrors: Record<string, string>
  profileApiError: { message: string } | null
  passwordApiError: { message: string } | null
  message: string
  passwordMessage: string
  isSaving: boolean
  avatarInput: RefObject<HTMLInputElement | null>
  edit: <K extends keyof UpdateProfileRequest>(key: K, value: UpdateProfileRequest[K]) => void
  editPassword: <K extends keyof ChangePasswordRequest>(key: K, value: string) => void
  handleAvatar: ChangeEventHandler<HTMLInputElement>
  onPickAvatar: () => void
  onRemoveAvatar: () => void
  onSubmit: FormEventHandler<HTMLFormElement>
}

export function ProfileForm({
  profile, form, password, primaryWallet, walletsPending, walletsError,
  errors, secretErrors, profileApiError, passwordApiError, message, passwordMessage,
  isSaving, avatarInput, edit, editPassword, handleAvatar, onPickAvatar, onRemoveAvatar, onSubmit,
}: ProfileFormProps) {
  return (
    <section className="profile-content">
      <h1>Perfil do colecionador</h1>
      <form className="profile-form" onSubmit={onSubmit} noValidate>
        <div className="profile-left-fields">
          <TextField id="profile-name" label="Nome de exibição" value={form.name} error={errors.name} autoComplete="name" onChange={(value) => edit('name', value)} />
          <TextField id="profile-email" label="E-mail" value={form.email} error={errors.email} type="email" autoComplete="email" onChange={(value) => edit('email', value)} />
          <TextField id="profile-wallet-label" label="Apelido da carteira" value={primaryWallet?.label ?? ''} readOnly descriptionId="profile-limitations" placeholder={walletsPending ? 'Carregando...' : 'Gerenciado em Carteiras'} />
        </div>

        <div className="profile-right-fields">
          <TextField id="profile-username" label="Nome de usuário" value="" readOnly descriptionId="profile-limitations" />
          <div className="profile-field">
            <label htmlFor="profile-ens">Nome ENS</label>
            <div className="profile-ens">
              <select aria-label="Sufixo ENS" value=".eth" disabled aria-describedby="profile-limitations"><option value=".eth">.eth</option></select>
              <Input id="profile-ens" value="" readOnly aria-describedby="profile-limitations" />
            </div>
          </div>
          <div className="profile-avatar">
            <p>Avatar</p>
            <div className="profile-avatar-controls">
              <div className="profile-avatar-preview">
                {form.avatarDataUrl ? <img src={form.avatarDataUrl} alt={`Avatar de ${form.name}`} className="size-full object-cover" /> : <UserRound aria-label="Sem avatar" className="size-6" />}
              </div>
              <input ref={avatarInput} id="profile-avatar" className="profile-avatar-file" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Imagem do avatar" onChange={handleAvatar} aria-invalid={Boolean(errors.avatarDataUrl)} aria-describedby={errors.avatarDataUrl ? 'profile-avatar-error' : 'profile-avatar-help'} />
              <Button type="button" onClick={onPickAvatar} aria-describedby="profile-avatar-help">Alterar</Button>
              <Button type="button" variant="ghost" onClick={onRemoveAvatar} disabled={!form.avatarDataUrl}>Remover</Button>
            </div>
            <p id="profile-avatar-help" className="sr-only">PNG, JPEG ou WebP, até 256 KB.</p>
            {errors.avatarDataUrl ? <p id="profile-avatar-error" role="alert" className="text-sm text-destructive">{errors.avatarDataUrl}</p> : null}
          </div>
        </div>

        <section className="profile-password" aria-labelledby="profile-password-title">
          <h2 id="profile-password-title">Alterar senha</h2>
          <div className="profile-password-fields">
            <TextField id="current-password" label="Senha atual" value={password.currentPassword} error={secretErrors.currentPassword} type="password" autoComplete="current-password" onChange={(value) => editPassword('currentPassword', value)} />
            <TextField id="new-password" label="Nova senha" value={password.newPassword} error={secretErrors.newPassword} type="password" autoComplete="new-password" onChange={(value) => editPassword('newPassword', value)} />
            <TextField id="confirm-password" label="Confirmar nova senha" value={password.confirmPassword} error={secretErrors.confirmPassword} type="password" autoComplete="new-password" onChange={(value) => editPassword('confirmPassword', value)} />
          </div>
          {passwordApiError ? <p role="alert" className="mt-3 text-sm text-destructive">{passwordApiError.message}</p> : null}
          {passwordMessage ? <p role="status" className="mt-3 text-sm text-primary">{passwordMessage}</p> : null}
        </section>

        <div className="profile-save">
          {profileApiError ? <p role="alert" className="mb-3 text-sm text-destructive">{profileApiError.message}</p> : null}
          {message ? <p role="status" className="mb-3 text-sm text-primary">{message}</p> : null}
          <Button type="submit" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</Button>
        </div>

        <p id="profile-limitations" className="profile-limitations">Nome de usuário e Nome ENS não podem ser salvos nesta versão. O apelido da carteira é gerenciado em <Link to="/wallets" className="underline">Carteiras</Link>.{walletsError ? ' Não foi possível consultar o apelido agora.' : ''}</p>

        <details className="profile-additional" open={Boolean(errors.bio || errors.favoriteCategories)}>
          <summary>Informações adicionais</summary>
          <div className="mt-4 space-y-5">
            <div className="profile-field"><label htmlFor="profile-bio">Bio</label>
              <textarea id="profile-bio" value={form.bio} maxLength={301} onChange={(event) => edit('bio', event.target.value)} aria-invalid={Boolean(errors.bio)} aria-describedby={errors.bio ? 'profile-bio-error' : 'profile-bio-help'} className="min-h-28 w-full rounded-sm border border-input bg-transparent p-3 outline-none focus-visible:ring-2 focus-visible:ring-primary" />
              <p id="profile-bio-help" className="text-xs text-muted-foreground">{form.bio.length}/300 caracteres</p>
              {errors.bio ? <p id="profile-bio-error" role="alert" className="text-sm text-destructive">{errors.bio}</p> : null}
            </div>
            <fieldset className="space-y-2"><legend>Categorias favoritas</legend><div className="flex flex-wrap gap-3">
              {categories.map((category) => <label key={category.id} className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={form.favoriteCategories.includes(category.id)} onChange={(event) => edit('favoriteCategories', event.target.checked ? [...form.favoriteCategories, category.id] : form.favoriteCategories.filter((id) => id !== category.id))} className="accent-primary" />{category.label}</label>)}
            </div>{errors.favoriteCategories ? <p role="alert" className="text-sm text-destructive">{errors.favoriteCategories}</p> : null}</fieldset>
            <p>NFTs coletados: <span className="font-bold">{profile.totalCollected}</span></p>
          </div>
        </details>
      </form>
    </section>
  )
}
