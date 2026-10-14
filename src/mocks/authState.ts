import type {
  AuthErrorResponse,
  AuthSession,
  LoginRequest,
  RegisterRequest,
  UserProfile,
} from '@/api/types/auth'
import { mockUsers, type MockUserRecord } from './fixtures/users'

const authStateKey = 'nft-marketplace.auth-state.v1'
const sessionDurationMs = 30 * 60 * 1000

type PersistedAuthState = {
  users: MockUserRecord[]
  session:
    | {
        token: string
        userId: string
        expiresAt: string
      }
    | null
}

type AuthResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: AuthErrorResponse }

export const mockAuthPolicy = {
  sessionDurationMinutes: sessionDurationMs / 60_000,
  credentials: [
    { email: 'ada@example.com', password: 'collector123' },
    { email: 'bruno@example.com', password: 'vault1234' },
  ],
}

export function resetAuthState() {
  writeState({
    users: structuredClone(mockUsers),
    session: null,
  })
}

export function loginUser(payload: LoginRequest): AuthResult<AuthSession> {
  const validation = validateLogin(payload)

  if (validation) {
    return validation
  }

  const state = readState()
  const user = state.users.find(
    (candidate) => normalizeEmail(candidate.email) === normalizeEmail(payload.email),
  )

  if (!user || user.passwordHash !== hashPassword(payload.password)) {
    return {
      ok: false,
      status: 401,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'E-mail ou senha invalidos.',
      },
    }
  }

  return persistSession(state, user)
}

export function registerUser(
  payload: RegisterRequest,
): AuthResult<AuthSession> {
  const validation = validateRegister(payload)

  if (validation) {
    return validation
  }

  const state = readState()
  const email = normalizeEmail(payload.email)
  const existing = state.users.some((user) => normalizeEmail(user.email) === email)

  if (existing) {
    return {
      ok: false,
      status: 409,
      error: {
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Ja existe uma conta com este e-mail.',
        fieldErrors: { email: 'E-mail ja cadastrado.' },
      },
    }
  }

  const user: MockUserRecord = {
    id: `user-${crypto.randomUUID()}`,
    name: payload.name.trim(),
    email,
    walletAddress: undefined,
    passwordHash: hashPassword(payload.password),
    createdAt: new Date().toISOString(),
    profile: {
      bio: 'Novo colecionador no marketplace.',
      favoriteCategories: [],
      totalCollected: 0,
    },
  }

  state.users.push(user)

  return persistSession(state, user)
}

export function getCurrentSession(): AuthResult<AuthSession | null> {
  const state = readState()

  if (!state.session) {
    return { ok: true, data: null }
  }

  if (Date.now() >= Date.parse(state.session.expiresAt)) {
    state.session = null
    writeState(state)

    return {
      ok: false,
      status: 401,
      error: {
        code: 'SESSION_EXPIRED',
        message: 'Sessao expirada. Faca login novamente.',
      },
    }
  }

  const user = state.users.find((candidate) => candidate.id === state.session?.userId)

  if (!user) {
    state.session = null
    writeState(state)
    return unauthenticated()
  }

  return {
    ok: true,
    data: {
      user: toAuthUser(user),
      expiresAt: state.session.expiresAt,
    },
  }
}

export function logoutUser() {
  const state = readState()
  state.session = null
  writeState(state)
}

export function getCurrentProfile(): AuthResult<UserProfile> {
  const session = getCurrentSession()

  if (!session.ok) {
    return session
  }

  if (!session.data) {
    return unauthenticated()
  }

  const currentSession = session.data
  const state = readState()
  const user = state.users.find((candidate) => candidate.id === currentSession.user.id)

  if (!user) {
    return unauthenticated()
  }

  return {
    ok: true,
    data: {
      ...toAuthUser(user),
      ...user.profile,
    },
  }
}

function readState(): PersistedAuthState {
  const raw = localStorage.getItem(authStateKey)

  if (!raw) {
    const initialState = {
      users: structuredClone(mockUsers),
      session: null,
    }
    writeState(initialState)
    return initialState
  }

  try {
    return JSON.parse(raw) as PersistedAuthState
  } catch {
    resetAuthState()
    return readState()
  }
}

function writeState(state: PersistedAuthState) {
  localStorage.setItem(authStateKey, JSON.stringify(state))
}

function persistSession(
  state: PersistedAuthState,
  user: MockUserRecord,
): AuthResult<AuthSession> {
  const expiresAt = new Date(Date.now() + sessionDurationMs).toISOString()

  state.session = {
    token: `mock-session-${crypto.randomUUID()}`,
    userId: user.id,
    expiresAt,
  }
  writeState(state)

  return {
    ok: true,
    data: {
      user: toAuthUser(user),
      expiresAt,
    },
  }
}

function validateLogin(payload: LoginRequest): AuthResult<never> | null {
  const fieldErrors: AuthErrorResponse['fieldErrors'] = {}

  if (!isEmail(payload.email)) {
    fieldErrors.email = 'Informe um e-mail valido.'
  }

  if (!payload.password) {
    fieldErrors.password = 'Informe sua senha.'
  }

  return validationError(fieldErrors)
}

function validateRegister(payload: RegisterRequest): AuthResult<never> | null {
  const fieldErrors: AuthErrorResponse['fieldErrors'] = {}

  if (payload.name.trim().length < 2) {
    fieldErrors.name = 'Informe seu nome.'
  }

  if (!isEmail(payload.email)) {
    fieldErrors.email = 'Informe um e-mail valido.'
  }

  if (payload.password.length < 8) {
    fieldErrors.password = 'Use pelo menos 8 caracteres.'
  }

  return validationError(fieldErrors)
}

function validationError(
  fieldErrors: AuthErrorResponse['fieldErrors'],
): AuthResult<never> | null {
  if (!fieldErrors || Object.keys(fieldErrors).length === 0) {
    return null
  }

  return {
    ok: false,
    status: 400,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Revise os campos informados.',
      fieldErrors,
    },
  }
}

function unauthenticated(): AuthResult<never> {
  return {
    ok: false,
    status: 401,
    error: {
      code: 'UNAUTHENTICATED',
      message: 'Sessao nao encontrada. Faca login para continuar.',
    },
  }
}

function toAuthUser(user: MockUserRecord) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    walletAddress: user.walletAddress,
    createdAt: user.createdAt,
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function hashPassword(password: string) {
  let hash = 0x811c9dc5

  for (const char of password) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 0x01000193)
  }

  return `mock-hash-${(hash >>> 0).toString(16)}`
}
