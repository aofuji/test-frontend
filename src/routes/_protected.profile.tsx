import { createFileRoute } from '@tanstack/react-router'
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'

import { useChangePassword, useProfile, useUpdateProfile } from '@/api/hooks/useAuth'
import { ApiError } from '@/api/http/errors'
import { useWallets } from '@/api/hooks/useWallets'
import type { ChangePasswordRequest, UpdateProfileRequest, UserProfile } from '@/api/types/auth'
import { LoadingSkeleton } from '@/components/shared/loading-skeleton'
import { AccountLayout } from '@/components/account/account-layout'
import { ProfileForm } from '@/features/profile/components/profile-form'
import { ProfileQueryError } from '@/features/profile/components/profile-query-error'

import './profile.css'

function ProfilePage() {
  const query = useProfile()
  if (query.isLoading) return <div className="profile-page"><AccountLayout active="profile"><LoadingSkeleton variant="detail" /></AccountLayout></div>
  if (query.isError || !query.data) {
    const expired = query.error instanceof ApiError && query.error.status === 401
    return <div className="profile-page"><AccountLayout active="profile"><ProfileQueryError
      message={query.error instanceof ApiError ? query.error.message : 'Tente novamente.'}
      expired={expired}
      onRetry={() => void query.refetch()}
    /></AccountLayout></div>
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
    <ProfileForm
      profile={profile}
      form={form}
      password={password}
      primaryWallet={primaryWallet}
      walletsPending={wallets.isPending}
      walletsError={wallets.isError}
      errors={errors}
      secretErrors={secretErrors}
      profileApiError={profileApiError}
      passwordApiError={passwordApiError}
      message={message}
      passwordMessage={passwordMessage}
      isSaving={update.isPending || change.isPending}
      avatarInput={avatarInput}
      edit={edit}
      editPassword={editPassword}
      handleAvatar={handleAvatar}
      onPickAvatar={() => avatarInput.current?.click()}
      onRemoveAvatar={() => { edit('avatarDataUrl', null); if (avatarInput.current) avatarInput.current.value = '' }}
      onSubmit={(event) => void saveChanges(event)}
    />
  )
}

function validatePassword(password: ChangePasswordRequest) {
  const errors: Record<string, string> = {}
  if (!password.currentPassword) errors.currentPassword = 'Informe a senha atual.'
  if (password.newPassword.length < 8) errors.newPassword = 'Use pelo menos 8 caracteres.'
  if (password.confirmPassword !== password.newPassword) errors.confirmPassword = 'As senhas nao coincidem.'
  return errors
}

export const Route = createFileRoute('/_protected/profile')({ component: ProfilePage })
