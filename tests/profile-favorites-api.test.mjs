import assert from 'node:assert/strict'
import { after, beforeEach, test } from 'node:test'
import { createServer } from 'vite'
import { setupServer } from 'msw/node'

const storage = new Map()
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
}
const vite = await createServer({ configFile: false, cacheDir: '/tmp/profile-favorites-api-vite-cache', resolve: { alias: { '@': `${process.cwd()}/src` } }, server: { middlewareMode: true, ws: false, watch: null } })
const { handlers } = await vite.ssrLoadModule('/src/mocks/handlers.ts')
for (const handler of handlers) if (handler.info?.path) handler.info.path = new URL(handler.info.path, 'http://localhost').href
const msw = setupServer(...handlers)
msw.listen({ onUnhandledRequest: 'error' })
after(async () => { msw.close(); await vite.close() })
beforeEach(() => storage.clear())

async function api(path, method = 'GET', body) {
  const response = await fetch(`http://localhost/api${path}`, { method, headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  return { status: response.status, data: await response.json() }
}
async function login(email = 'ada@example.com', password = 'collector123') {
  const response = await api('/auth/login', 'POST', { email, password })
  assert.equal(response.status, 200)
}

const avatar = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/v1cAAAAASUVORK5CYII='

test('profile validates, persists name/email/bio/categories/avatar and isolates users', async () => {
  assert.equal((await api('/profile')).status, 401)
  assert.equal((await api('/profile', 'PATCH', {})).status, 401)
  await login()
  const initial = (await api('/profile')).data.profile
  assert.equal(initial.name, 'Ada Collector')
  assert.equal((await api('/__mock/profile/read-failure', 'POST', { enabled: true })).status, 200)
  assert.equal((await api('/profile')).status, 500)
  assert.equal((await api('/__mock/profile/read-failure', 'POST', { enabled: false })).status, 200)
  assert.equal((await api('/profile')).status, 200)
  const invalid = await api('/profile', 'PATCH', { name: 'A', email: 'bad', bio: 'x'.repeat(301), favoriteCategories: ['bad'], avatarDataUrl: 'https://example.com/picture.png' })
  assert.equal(invalid.status, 400)
  assert.deepEqual(Object.keys(invalid.data.fieldErrors).sort(), ['avatarDataUrl', 'bio', 'email', 'favoriteCategories', 'name'])
  const conflict = await api('/profile', 'PATCH', { name: 'Ada Nova', email: 'bruno@example.com', bio: 'Nova bio', favoriteCategories: ['art'], avatarDataUrl: avatar })
  assert.equal(conflict.status, 409)
  const saved = await api('/profile', 'PATCH', { name: 'Ada Nova', email: 'ada.nova@example.com', bio: 'Nova bio', favoriteCategories: ['art', 'pixel'], avatarDataUrl: avatar })
  assert.equal(saved.status, 200)
  assert.equal(saved.data.profile.avatarDataUrl, avatar)
  assert.equal(saved.data.profile.totalCollected, initial.totalCollected)
  assert.equal((await api('/profile')).data.profile.email, 'ada.nova@example.com')
  assert.equal((await api('/auth/session')).data.user.name, 'Ada Nova')
  await api('/auth/logout', 'POST')
  assert.equal((await api('/profile')).status, 401)
  await login('bruno@example.com', 'vault1234')
  assert.equal((await api('/profile')).data.profile.avatarDataUrl, null)
  await api('/auth/logout', 'POST')
  await login('ada.nova@example.com', 'collector123')
  assert.equal((await api('/profile')).data.profile.bio, 'Nova bio')
})

test('featured REST list and gallery fixtures reflect current NFT state', async () => {
  const featured = await api('/nfts?featuredOnly=true&pageSize=3')
  assert.equal(featured.status, 200)
  assert.equal(featured.data.total, 3)
  assert.deepEqual(featured.data.items.map((item) => item.id), ['aurora-001', 'neon-204', 'orbit-512'])
  const detail = await api('/nfts/aurora-001')
  assert.equal(detail.data.images.length, 2)
  assert.ok(detail.data.images.every((image) => image.src.startsWith('/images/nfts/') && image.alt))
  assert.equal((await api('/__mock/realtime/nft', 'POST', { nftId: 'aurora-001', priceEth: '1.44', available: false })).status, 200)
  const updated = await api('/nfts?featuredOnly=true&pageSize=3')
  assert.equal(updated.data.items[0].priceEth, '1.44')
  assert.equal(updated.data.items[0].available, false)
})

test('password changes require current password and never persist the clear text', async () => {
  await login()
  assert.equal((await api('/profile/password', 'POST', { currentPassword: 'wrong', newPassword: 'newPassword123', confirmPassword: 'newPassword123' })).status, 400)
  const mismatch = await api('/profile/password', 'POST', { currentPassword: 'collector123', newPassword: 'newPassword123', confirmPassword: 'different' })
  assert.equal(mismatch.data.fieldErrors.confirmPassword, 'As senhas nao coincidem.')
  const changed = await api('/profile/password', 'POST', { currentPassword: 'collector123', newPassword: 'newPassword123', confirmPassword: 'newPassword123' })
  assert.equal(changed.status, 200)
  assert.equal(JSON.stringify([...storage.values()]).includes('newPassword123'), false)
  await api('/auth/logout', 'POST')
  assert.equal((await api('/auth/login', 'POST', { email: 'ada@example.com', password: 'collector123' })).status, 401)
  await login('ada@example.com', 'newPassword123')
  assert.equal((await api('/profile')).status, 200)
})

test('favorites are authenticated, idempotent, isolated, recover from failure, and reset', async () => {
  assert.equal((await api('/favorites')).status, 401)
  assert.equal((await api('/favorites/aurora-001', 'PUT')).status, 401)
  await login()
  assert.deepEqual((await api('/favorites')).data.nftIds, [])
  assert.equal((await api('/favorites/missing', 'PUT')).status, 404)
  assert.deepEqual((await api('/favorites/aurora-001', 'PUT')).data.nftIds, ['aurora-001'])
  assert.deepEqual((await api('/favorites/aurora-001', 'PUT')).data.nftIds, ['aurora-001'])
  await api('/__mock/favorites/fail-next', 'POST', { type: 'error' })
  assert.equal((await api('/favorites/aurora-001', 'DELETE')).status, 500)
  assert.deepEqual((await api('/favorites')).data.nftIds, ['aurora-001'])
  assert.deepEqual((await api('/favorites/aurora-001', 'DELETE')).data.nftIds, [])
  await api('/favorites/aurora-001', 'PUT')
  await api('/auth/logout', 'POST')
  await login('bruno@example.com', 'vault1234')
  assert.deepEqual((await api('/favorites')).data.nftIds, [])
  await api('/__mock/reset-auth', 'POST')
  await login()
  assert.deepEqual((await api('/favorites')).data.nftIds, [])
})

test('expired session blocks private data and login recovers saved profile and favorites', async () => {
  await login()
  await api('/favorites/aurora-001', 'PUT')
  const raw = JSON.parse(storage.get('nft-marketplace.auth-state.v1'))
  raw.session.expiresAt = '2000-01-01T00:00:00.000Z'
  storage.set('nft-marketplace.auth-state.v1', JSON.stringify(raw))
  assert.equal((await api('/profile')).status, 401)
  assert.equal((await api('/favorites')).status, 401)
  await login()
  assert.equal((await api('/profile')).status, 200)
  assert.deepEqual((await api('/favorites')).data.nftIds, ['aurora-001'])
})
