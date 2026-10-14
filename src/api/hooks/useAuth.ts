import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { changePassword, getProfile, getSession, login, logout, register, updateProfile } from '../auth'
import { queryKeys } from '../queryKeys'
import type { AuthSession, ChangePasswordRequest, LoginRequest, RegisterRequest, UpdateProfileRequest } from '../types/auth'

export function useSession() {
  return useQuery({
    queryKey: queryKeys.auth.session(),
    queryFn: ({ signal }) => getSession(signal),
    staleTime: 15_000,
    retry: false,
  })
}

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.auth.profile(),
    queryFn: ({ signal }) => getProfile(signal),
    retry: false,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateProfileRequest) => updateProfile(payload),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.auth.profile(), profile)
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
    onSuccess: async (session) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.all })
      queryClient.removeQueries({ queryKey: queryKeys.cart.all })
      queryClient.setQueryData(queryKeys.auth.session(), session)
      queryClient.removeQueries({ queryKey: queryKeys.auth.private() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all })
    },
  })
}

export function useRegister() {
  const queryClient = useQueryClient()

  return useMutation({
    scope: { id: 'cart-session' },
    mutationFn: (payload: RegisterRequest) => register(payload),
    onSuccess: async (session) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.all })
      queryClient.removeQueries({ queryKey: queryKeys.cart.all })
      queryClient.setQueryData(queryKeys.auth.session(), session)
      queryClient.removeQueries({ queryKey: queryKeys.auth.private() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all })
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    scope: { id: 'cart-session' },
    mutationFn: logout,
    onSuccess: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.all })
      queryClient.removeQueries({ queryKey: queryKeys.cart.all })
      queryClient.setQueryData(queryKeys.auth.session(), null)
      queryClient.removeQueries({ queryKey: queryKeys.auth.private() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all })
    },
  })
}
