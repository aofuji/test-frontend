import { Link, createFileRoute } from '@tanstack/react-router'
import { RotateCcw, UserRound } from 'lucide-react'
import { useState, type ChangeEvent, type FormEvent } from 'react'

import { useChangePassword, useProfile, useUpdateProfile } from '@/api/hooks/useAuth'
import { ApiError } from '@/api/http/errors'
import type { ChangePasswordRequest, UpdateProfileRequest, UserProfile } from '@/api/types/auth'
import { LoadingSkeleton } from '@/components/shared/loading-skeleton'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const categories = [
  { id: 'art', label: 'Arte' },
  { id: 'generative', label: 'Generativo' },
  { id: 'photography', label: 'Fotografia' },
  { id: 'pixel', label: 'Pixel art' },
]

function ProfilePage() {
  const query = useProfile()
  if (query.isLoading) return <LoadingSkeleton variant="detail" />
  if (query.isError || !query.data) {
    const expired = query.error instanceof ApiError && query.error.status === 401
    return <Card className="mx-auto max-w-xl"><CardContent className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Nao foi possivel carregar o perfil</h1>
      <p role="alert">{query.error instanceof ApiError ? query.error.message : 'Tente novamente.'}</p>
      {expired ? <Button asChild><Link to="/login" search={{ redirect: '/profile' }}>Entrar novamente</Link></Button> : null}
      <Button variant="outline" onClick={() => void query.refetch()}><RotateCcw aria-hidden="true" /> Tentar novamente</Button>
    </CardContent></Card>
  }
  return <ProfileContent key={query.data.id} profile={query.data} />
}

function ProfileContent({ profile }: { profile: UserProfile }) {
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

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    update.reset()
    setMessage('')
    const next: Record<string, string> = {}
    if (form.name.trim().length < 2) next.name = 'Informe um nome com pelo menos 2 caracteres.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Informe um e-mail valido.'
    if (form.bio.length > 300) next.bio = 'A bio deve ter no maximo 300 caracteres.'
    setLocalErrors(next)
    if (Object.keys(next).length) return
    try {
      const saved = await update.mutateAsync(form)
      setForm({ name: saved.name, email: saved.email, bio: saved.bio, favoriteCategories: [...saved.favoriteCategories], avatarDataUrl: saved.avatarDataUrl })
      setMessage('Perfil atualizado com sucesso.')
    } catch { /* API errors are rendered from the mutation. */ }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    change.reset()
    setPasswordMessage('')
    const next: Record<string, string> = {}
    if (!password.currentPassword) next.currentPassword = 'Informe a senha atual.'
    if (password.newPassword.length < 8) next.newPassword = 'Use pelo menos 8 caracteres.'
    if (password.confirmPassword !== password.newPassword) next.confirmPassword = 'As senhas nao coincidem.'
    setPasswordErrors(next)
    if (Object.keys(next).length) return
    try {
      await change.mutateAsync(password)
      setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordMessage('Senha alterada com sucesso.')
    } catch { /* API errors are rendered from the mutation. */ }
  }

  return <section className="space-y-6">
    <div className="space-y-2"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Perfil</p><h1 className="text-4xl font-semibold tracking-tight">Perfil do colecionador</h1></div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader><CardTitle>Dados do colecionador</CardTitle><CardDescription>Edite os dados da conta simulada.</CardDescription></CardHeader>
        <CardContent><form className="space-y-5" onSubmit={(event) => void saveProfile(event)} noValidate>
          <div className="flex flex-wrap items-center gap-4">
            <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-primary">
              {form.avatarDataUrl ? <img src={form.avatarDataUrl} alt={`Avatar de ${form.name}`} className="size-full object-cover" /> : <UserRound aria-label="Sem avatar" className="size-8" />}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <label htmlFor="profile-avatar" className="text-sm font-medium">Avatar</label>
              <Input id="profile-avatar" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatar} aria-invalid={Boolean(errors.avatarDataUrl)} aria-describedby={errors.avatarDataUrl ? 'profile-avatar-error' : 'profile-avatar-help'} className="h-auto min-h-10 py-2" />
              <p id="profile-avatar-help" className="text-xs text-muted-foreground">PNG, JPEG ou WebP, ate 256 KB.</p>
              {errors.avatarDataUrl ? <p id="profile-avatar-error" className="text-sm text-destructive">{errors.avatarDataUrl}</p> : null}
              {form.avatarDataUrl ? <Button type="button" size="sm" variant="ghost" onClick={() => edit('avatarDataUrl', null)}>Remover avatar</Button> : null}
            </div>
          </div>
          <TextField id="profile-name" label="Nome" value={form.name} error={errors.name} autoComplete="name" onChange={(value) => edit('name', value)} />
          <TextField id="profile-email" label="E-mail" value={form.email} error={errors.email} type="email" autoComplete="email" onChange={(value) => edit('email', value)} />
          <div className="space-y-2"><label htmlFor="profile-bio" className="text-sm font-medium">Bio</label>
            <textarea id="profile-bio" value={form.bio} maxLength={301} onChange={(event) => edit('bio', event.target.value)} aria-invalid={Boolean(errors.bio)} aria-describedby={errors.bio ? 'profile-bio-error' : 'profile-bio-help'} className="min-h-28 w-full rounded-lg border border-input bg-transparent p-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />
            <p id="profile-bio-help" className="text-xs text-muted-foreground">{form.bio.length}/300 caracteres</p>
            {errors.bio ? <p id="profile-bio-error" className="text-sm text-destructive">{errors.bio}</p> : null}
          </div>
          <fieldset className="space-y-2"><legend className="text-sm font-medium">Categorias favoritas</legend><div className="flex flex-wrap gap-3">
            {categories.map((category) => <label key={category.id} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><input type="checkbox" checked={form.favoriteCategories.includes(category.id)} onChange={(event) => edit('favoriteCategories', event.target.checked ? [...form.favoriteCategories, category.id] : form.favoriteCategories.filter((id) => id !== category.id))} className="accent-primary" />{category.label}</label>)}
          </div>{errors.favoriteCategories ? <p role="alert" className="text-sm text-destructive">{errors.favoriteCategories}</p> : null}</fieldset>
          {profileApiError ? <p role="alert" className="text-sm text-destructive">{profileApiError.message}</p> : null}
          {message ? <p role="status" className="text-sm text-primary">{message}</p> : null}
          <Button type="submit" disabled={update.isPending}>{update.isPending ? 'Salvando...' : 'Salvar perfil'}</Button>
        </form></CardContent>
      </Card>
      <div className="space-y-5">
        <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">NFTs coletados</p><p className="mt-1 text-4xl font-semibold">{profile.totalCollected}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Alterar senha</CardTitle><CardDescription>Use a senha atual para confirmar a troca.</CardDescription></CardHeader><CardContent>
          <form className="space-y-4" onSubmit={(event) => void savePassword(event)} noValidate>
            <TextField id="current-password" label="Senha atual" value={password.currentPassword} error={secretErrors.currentPassword} type="password" autoComplete="current-password" onChange={(value) => editPassword('currentPassword', value)} />
            <TextField id="new-password" label="Nova senha" value={password.newPassword} error={secretErrors.newPassword} type="password" autoComplete="new-password" onChange={(value) => editPassword('newPassword', value)} />
            <TextField id="confirm-password" label="Confirmar nova senha" value={password.confirmPassword} error={secretErrors.confirmPassword} type="password" autoComplete="new-password" onChange={(value) => editPassword('confirmPassword', value)} />
            {passwordApiError ? <p role="alert" className="text-sm text-destructive">{passwordApiError.message}</p> : null}
            {passwordMessage ? <p role="status" className="text-sm text-primary">{passwordMessage}</p> : null}
            <Button type="submit" disabled={change.isPending}>{change.isPending ? 'Alterando...' : 'Alterar senha'}</Button>
          </form>
        </CardContent></Card>
      </div>
    </div>
  </section>
}

function TextField({ id, label, value, error, onChange, type = 'text', autoComplete }: {
  id: string; label: string; value: string; error?: string; onChange: (value: string) => void; type?: string; autoComplete?: string
}) {
  return <div className="space-y-2"><label htmlFor={id} className="text-sm font-medium">{label}</label><Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />{error ? <p id={`${id}-error`} className="text-sm text-destructive">{error}</p> : null}</div>
}

export const Route = createFileRoute('/_protected/profile')({ component: ProfilePage })
