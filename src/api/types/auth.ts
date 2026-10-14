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
  avatarDataUrl: string | null
}

export type UpdateProfileRequest = {
  name: string
  email: string
  bio: string
  favoriteCategories: string[]
  avatarDataUrl: string | null
}

export type ChangePasswordRequest = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
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
  | 'INCORRECT_PASSWORD'

export type AuthErrorResponse = {
  code: AuthErrorCode
  message: string
  fieldErrors?: Record<string, string>
}
