import { apiClient } from './http/client'
import type {
  AuthResponse,
  AuthSession,
  LoginRequest,
  ProfileResponse,
  RegisterRequest,
} from './types/auth'

export async function getSession(signal?: AbortSignal) {
  const response = await apiClient.get<AuthSession | null>('/auth/session', {
    signal,
  })

  return response.data
}

export async function login(payload: LoginRequest) {
  const response = await apiClient.post<AuthResponse>('/auth/login', payload)

  return response.data.session
}

export async function register(payload: RegisterRequest) {
  const response = await apiClient.post<AuthResponse>('/auth/register', payload)

  return response.data.session
}

export async function logout() {
  await apiClient.post('/auth/logout')
}

export async function getProfile(signal?: AbortSignal) {
  const response = await apiClient.get<ProfileResponse>('/profile', { signal })

  return response.data.profile
}
