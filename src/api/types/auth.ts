export type AuthUser = {
  id: string
  name: string
  email: string
  walletAddress?: string
  createdAt: string
}

export type UserProfile = AuthUser & {
  bio: string
  favoriteCategories: string[]
  totalCollected: number
}

export type AuthSession = {
  user: AuthUser
  expiresAt: string
}

export type LoginRequest = {
  email: string
  password: string
}

export type RegisterRequest = {
  name: string
  email: string
  password: string
}

export type AuthResponse = {
  session: AuthSession
}

export type ProfileResponse = {
  profile: UserProfile
}

export type AuthErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_ALREADY_EXISTS'
  | 'SESSION_EXPIRED'
  | 'UNAUTHENTICATED'

export type AuthErrorResponse = {
  code: AuthErrorCode
  message: string
  fieldErrors?: Partial<Record<keyof RegisterRequest | keyof LoginRequest, string>>
}
