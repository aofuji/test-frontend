import { Link, createFileRoute } from '@tanstack/react-router'
import { Eye, EyeOff, RotateCcw, UserRound } from 'lucide-react'
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'

import { useChangePassword, useProfile, useUpdateProfile } from '@/api/hooks/useAuth'
import { ApiError } from '@/api/http/errors'
import { useWallets } from '@/api/hooks/useWallets'
import type { ChangePasswordRequest, UpdateProfileRequest, UserProfile } from '@/api/types/auth'
import { LoadingSkeleton } from '@/components/shared/loading-skeleton'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { AccountLayout } from '@/components/account/account-layout'

import './profile.css'

const categories = [
  { id: 'art', label: 'Arte' },
  { id: 'generative', label: 'Generativo' },
  { id: 'photography', label: 'Fotografia' },
  { id: 'pixel', label: 'Pixel art' },
]

function ProfilePage() {
  const query = useProfile()
  if (query.isLoading) return <div className="profile-page"><AccountLayout active="profile"><LoadingSkeleton variant="detail" /></AccountLayout></div>
  if (query.isError || !query.data) {
    const expired = query.error instanceof ApiError && query.error.status === 401
    return <div className="profile-page"><AccountLayout active="profile"><Card className="mx-auto max-w-xl"><CardContent className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Nao foi possivel carregar o perfil</h1>
      <p role="alert">{query.error instanceof ApiError ? query.error.message : 'Tente novamente.'}</p>
      {expired ? <Button asChild><Link to="/login" search={{ redirect: '/profile' }}>Entrar novamente</Link></Button> : null}
      <Button variant="outline" onClick={() => void query.refetch()}><RotateCcw aria-hidden="true" /> Tentar novamente</Button>
    </CardContent></Card></AccountLayout></div>
  }
  return <div className="profile-page"><AccountLayout active="profile"><ProfileContent key={query.data.id} profile={query.data} /></AccountLayout></div>
}

function ProfileContent({ profile }: { profile: UserProfile }) {
  const wallets = useWallets()
  const primaryWallet = wallets.data?.find((wallet) => wallet.isDefault) ?? wallets.data?.find((wallet) => wallet.kind === 'primary')
  const avatarInput = useRef<HTMLInputElement | null>(null)
  const update = useUpdateProfile()
  const change = useChangePassword()
  const [form, setForm] = useState<UpdateProfileRequest>({
    name: profile.name, email: profile.email, bio: profile.bio,
    favoriteCategories: [...profile.favoriteCategories], avatarDataUrl: profile.avatarDataUrl,
  })
  const [password, setPassword] = useState<ChangePasswordRequest>({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const profileApiError = update.error instanceof ApiError ? update.error : null
  const passwordApiError = change.error instanceof ApiError ? change.error : null
  const errors = { ...localErrors, ...profileApiError?.fieldErrors }
  const secretErrors = { ...passwordErrors, ...passwordApiError?.fieldErrors }

  function edit<K extends keyof UpdateProfileRequest>(key: K, value: UpdateProfileRequest[K]) {
    update.reset()
    setForm((current) => ({ ...current, [key]: value }))
    setLocalErrors((current) => ({ ...current, [key]: '' }))
  }

  function editPassword<K extends keyof ChangePasswordRequest>(key: K, value: string) {
    change.reset()
    setPassword((current) => ({ ...current, [key]: value }))
    setPasswordErrors((current) => ({ ...current, [key]: '' }))
  }

  function handleAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    update.reset()
    setMessage('')
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 256 * 1024) {
      setLocalErrors((current) => ({ ...current, avatarDataUrl: 'Use PNG, JPEG ou WebP de ate 256 KB.' }))
      event.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        edit('avatarDataUrl', reader.result)
        setLocalErrors((current) => ({ ...current, avatarDataUrl: '' }))
      }
    }
    reader.onerror = () => setLocalErrors((current) => ({ ...current, avatarDataUrl: 'Nao foi possivel ler a imagem.' }))
    reader.readAsDataURL(file)
  }

  async function saveProfile() {
    update.reset()
    setMessage('')
    const next: Record<string, string> = {}
    if (form.name.trim().length < 2) next.name = 'Informe um nome com pelo menos 2 caracteres.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Informe um e-mail valido.'
    if (form.bio.length > 300) next.bio = 'A bio deve ter no maximo 300 caracteres.'
    setLocalErrors(next)
    if (Object.keys(next).length) return false
    try {
      const saved = await update.mutateAsync(form)
      setForm({ name: saved.name, email: saved.email, bio: saved.bio, favoriteCategories: [...saved.favoriteCategories], avatarDataUrl: saved.avatarDataUrl })
      setMessage('Perfil atualizado com sucesso.')
      return true
    } catch { return false /* API errors are rendered from the mutation. */ }
  }

  async function savePassword() {
    change.reset()
    setPasswordMessage('')
    const next = validatePassword(password)
    setPasswordErrors(next)
    if (Object.keys(next).length) return
    try {
      await change.mutateAsync(password)
      setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordMessage('Senha alterada com sucesso.')
    } catch { /* API errors are rendered from the mutation. */ }
  }

  async function saveChanges(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const changingPassword = Object.values(password).some(Boolean)
    const next = changingPassword ? validatePassword(password) : {}
    setPasswordErrors(next)
    if (Object.keys(next).length) return
    if (await saveProfile() && changingPassword) await savePassword()
  }

  return (
    <section className="profile-content">
      <h1>Perfil do colecionador</h1>
      <form className="profile-form" onSubmit={(event) => void saveChanges(event)} noValidate>
        <div className="profile-left-fields">
          <TextField id="profile-name" label="Nome de exibição" value={form.name} error={errors.name} autoComplete="name" onChange={(value) => edit('name', value)} />
          <TextField id="profile-email" label="E-mail" value={form.email} error={errors.email} type="email" autoComplete="email" onChange={(value) => edit('email', value)} />
          <TextField id="profile-wallet-label" label="Apelido da carteira" value={primaryWallet?.label ?? ''} readOnly descriptionId="profile-limitations" placeholder={wallets.isPending ? 'Carregando...' : 'Gerenciado em Carteiras'} />
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
              <Button type="button" onClick={() => avatarInput.current?.click()} aria-describedby="profile-avatar-help">Alterar</Button>
              <Button type="button" variant="ghost" onClick={() => { edit('avatarDataUrl', null); if (avatarInput.current) avatarInput.current.value = '' }} disabled={!form.avatarDataUrl}>Remover</Button>
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
          <Button type="submit" disabled={update.isPending || change.isPending}>{update.isPending || change.isPending ? 'Salvando...' : 'Salvar'}</Button>
        </div>

        <p id="profile-limitations" className="profile-limitations">Nome de usuário e Nome ENS não podem ser salvos nesta versão. O apelido da carteira é gerenciado em <Link to="/wallets" className="underline">Carteiras</Link>.{wallets.isError ? ' Não foi possível consultar o apelido agora.' : ''}</p>

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

function validatePassword(password: ChangePasswordRequest) {
  const errors: Record<string, string> = {}
  if (!password.currentPassword) errors.currentPassword = 'Informe a senha atual.'
  if (password.newPassword.length < 8) errors.newPassword = 'Use pelo menos 8 caracteres.'
  if (password.confirmPassword !== password.newPassword) errors.confirmPassword = 'As senhas nao coincidem.'
  return errors
}

function TextField({ id, label, value, error, onChange, type = 'text', autoComplete, readOnly, descriptionId, placeholder }: {
  id: string; label: string; value: string; error?: string; onChange?: (value: string) => void; type?: string; autoComplete?: string; readOnly?: boolean; descriptionId?: string; placeholder?: string
}) {
  const [visible, setVisible] = useState(false)
  const password = type === 'password'
  return (
    <div className="profile-field">
      <label htmlFor={id}>{label}</label>
      <div className="relative min-w-0">
        <Input id={id} type={password && visible ? 'text' : type} value={value} onChange={onChange ? (event) => onChange(event.target.value) : undefined} autoComplete={autoComplete} readOnly={readOnly} placeholder={placeholder} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : descriptionId} className={password ? 'pr-10' : undefined} />
        {password ? <button type="button" className="profile-password-toggle" aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`} aria-pressed={visible} aria-controls={id} onClick={() => setVisible((current) => !current)}>{visible ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}</button> : null}
      </div>
      {error ? <p id={`${id}-error`} role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

export const Route = createFileRoute('/_protected/profile')({ component: ProfilePage })
