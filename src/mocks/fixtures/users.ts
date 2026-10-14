import type { AuthUser, UserProfile } from '@/api/types/auth'

export type MockUserRecord = AuthUser & {
  passwordHash: string
  profile: Omit<UserProfile, keyof AuthUser>
}

export const mockUsers: MockUserRecord[] = [
  {
    id: 'user-ada',
    name: 'Ada Collector',
    email: 'ada@example.com',
    walletAddress: '0xA11CE8b3F4D7c9E21B7A0fE45B0A7e2C9dA00123',
    passwordHash: 'mock-hash-4acba498',
    createdAt: '2026-01-10T12:00:00.000Z',
    profile: {
      bio: 'Colecionadora de arte generativa e fotografia on-chain.',
      favoriteCategories: ['generative', 'photography'],
      totalCollected: 12,
      avatarDataUrl: null,
    },
  },
  {
    id: 'user-bruno',
    name: 'Bruno Vault',
    email: 'bruno@example.com',
    walletAddress: '0xB8A91F2C6d4e9803a31b8F0d2A5C7c9f7710BEEF',
    passwordHash: 'mock-hash-e7a3d35f',
    createdAt: '2026-02-14T15:30:00.000Z',
    profile: {
      bio: 'Curador de edicoes raras e colecoes pixel art.',
      favoriteCategories: ['pixel', 'art'],
      totalCollected: 7,
      avatarDataUrl: null,
    },
  },
]
