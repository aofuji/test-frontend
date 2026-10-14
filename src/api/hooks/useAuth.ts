import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getProfile, getSession, login, logout, register } from '../auth'
import { queryKeys } from '../queryKeys'
import type { LoginRequest, RegisterRequest } from '../types/auth'

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

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: LoginRequest) => login(payload),
    onSuccess: (session) => {
      queryClient.setQueryData(queryKeys.auth.session(), session)
      queryClient.removeQueries({ queryKey: queryKeys.auth.private() })
    },
  })
}

export function useRegister() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: RegisterRequest) => register(payload),
    onSuccess: (session) => {
      queryClient.setQueryData(queryKeys.auth.session(), session)
      queryClient.removeQueries({ queryKey: queryKeys.auth.private() })
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.setQueryData(queryKeys.auth.session(), null)
      queryClient.removeQueries({ queryKey: queryKeys.auth.private() })
    },
  })
}
