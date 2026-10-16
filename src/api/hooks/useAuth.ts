import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'

import { changePassword, getProfile, getSession, login, logout, register, updateProfile } from '../auth'
import { queryKeys } from '../queryKeys'
import type { AuthSession, ChangePasswordRequest, LoginRequest, RegisterRequest, UpdateProfileRequest } from '../types/auth'
import { usePrivateMutation } from './usePrivateMutation'

export function useSession() {
  return useQuery({
    queryKey: queryKeys.auth.session(),
    queryFn: ({ signal }) => getSession(signal),
    staleTime: 15_000,
    retry: false,
  })
}

export function useProfile() {
  const userId = useSession().data?.user.id
  return useQuery({
    queryKey: queryKeys.auth.profile(userId),
    queryFn: ({ signal }) => getProfile(signal),
    retry: false,
    enabled: Boolean(userId),
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const userId = useSession().data?.user.id
  return usePrivateMutation({
    mutationFn: (payload: UpdateProfileRequest) => updateProfile(payload),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.auth.profile(userId), profile)
      queryClient.setQueryData<AuthSession | null>(queryKeys.auth.session(), (current) => current
        ? { ...current, user: { ...current.user, name: profile.name, email: profile.email } }
        : current)
    },
  })
}

export function useChangePassword() {
  return useMutation({ mutationFn: (payload: ChangePasswordRequest) => changePassword(payload) })
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    scope: { id: 'cart-session' },
    mutationFn: (payload: LoginRequest) => login(payload),
    onSuccess: (session) => replaceSession(queryClient, session),
  })
}

export function useRegister() {
  const queryClient = useQueryClient()

  return useMutation({
    scope: { id: 'cart-session' },
    mutationFn: (payload: RegisterRequest) => register(payload),
    onSuccess: (session) => replaceSession(queryClient, session),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    scope: { id: 'cart-session' },
    mutationFn: logout,
    onSuccess: () => replaceSession(queryClient, null),
  })
}

async function replaceSession(queryClient: QueryClient, session: AuthSession | null) {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: queryKeys.auth.session() }),
    queryClient.cancelQueries({ queryKey: queryKeys.cart.all }),
    queryClient.cancelQueries({ queryKey: queryKeys.auth.private() }),
  ])
  queryClient.removeQueries({ queryKey: queryKeys.cart.all })
  queryClient.setQueryData(queryKeys.auth.session(), session)
  queryClient.removeQueries({ queryKey: queryKeys.auth.private() })
  void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all })
}
