import assert from 'node:assert/strict'
import { after, test } from 'node:test'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const base = process.env.AUTH_TEST_URL || 'http://127.0.0.1:5173'
after(() => browser.close())

async function withApp(run) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  page.setDefaultTimeout(12_000)
  const api = (path, method = 'GET', body) => page.evaluate(async ({ path, method, body }) => {
    const response = await fetch(`/api${path}`, { method, headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
    return { status: response.status, data: await response.json() }
  }, { path, method, body })
  try {
    await page.goto(`${base}/login?redirect=%2Fcart`)
    await page.getByLabel('E-mail', { exact: true }).fill('ada@example.com')
    await page.getByLabel('Senha', { exact: true }).fill('collector123')
    await page.getByRole('main').getByRole('button', { name: 'Entrar', exact: true }).click()
    await page.waitForURL((url) => url.pathname === '/cart')
    await page.locator('header').getByRole('link', { name: 'Ada Collector', exact: true }).waitFor()
    await run({ page, api })
  } finally { await context.close() }
}

async function mount(page, orderId) {
  await page.evaluate(async (orderId) => { const { mountPrivateCacheProbe } = await import('/tests/helpers/private-cache-probe.mjs'); mountPrivateCacheProbe(orderId) }, orderId)
  await page.waitForFunction(() => window.__privateProbe?.profile?.id === 'user-ada')
  await settled(page)
}

async function settled(page, includeMutations = true) {
  await page.waitForFunction(async (includeMutations) => {
    const { queryClient } = await import('/src/api/queryClient.ts')
    return !queryClient.isFetching() && (!includeMutations || !queryClient.isMutating())
  }, includeMutations)
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

const snapshot = (page) => page.evaluate(() => {
  const { userId, profile, wallets, order, cart, favorites } = window.__privateProbe
  return { userId, profile, wallets, order, cart, favorites }
})

async function login(page, user) {
  await page.evaluate(async (user) => {
    await window.__privateProbe.login.mutateAsync(user === 'ada'
      ? { email: 'ada@example.com', password: 'collector123' }
      : { email: 'bruno@example.com', password: 'vault1234' })
  }, user)
  await page.waitForFunction((id) => window.__privateProbe.userId === id && window.__privateProbe.profile?.id === id, `user-${user}`)
  await settled(page, false)
}

async function installGate(page, method, path, fail = false) {
  await page.evaluate(async ({ method, path, fail }) => {
    const resource = performance.getEntriesByType('resource').find((entry) => entry.name.includes('/src/api/http/client.ts'))
    const { apiClient } = await import(resource.name)
    const { ApiError } = await import('/src/api/http/errors.ts')
    const state = window.__privateGate = { arrivals: 0, done: false, writes: [] }
    const gate = new Promise((resolve) => { state.release = resolve })
    apiClient.interceptors.response.use(async (response) => {
      if (response.config.method === method && response.config.url === path && state.arrivals++ === 0) {
        state.result = structuredClone(response.data)
        await gate
        state.unblocked = true
        if (fail) throw new ApiError('Resposta perdida depois da operacao.', { code: 'ERR_NETWORK' })
      }
      return response
    })
  }, { method, path, fail })
}

async function start(page, mutation, payload) {
  await page.evaluate(({ mutation, payload }) => {
    window.__privateProbe[mutation].mutateAsync(payload).then(
      () => { window.__privateGate.done = true },
      () => { window.__privateGate.done = true },
    )
  }, { mutation, payload })
  await page.waitForFunction(() => Boolean(window.__privateGate.result))
}

async function release(page) {
  await page.evaluate(() => window.__privateGate.release())
  await page.waitForFunction(() => window.__privateGate.done && window.__privateGate.unblocked)
  await settled(page)
}

const adaProfile = { name: 'Ada resposta antiga', email: 'ada@example.com', bio: 'Original', favoriteCategories: ['art'], avatarDataUrl: null }

for (const expired of [false, true]) {
  test(`late ${expired ? 'expired' : 'valid A'} session query cannot replace a completed B login`, async () => {
    await withApp(async ({ page, api }) => {
      await mount(page)
      if (expired) await api('/auth/logout', 'POST')
      await installGate(page, 'get', '/auth/session')
      await page.evaluate(async () => {
        const { queryClient } = await import('/src/api/queryClient.ts')
        void queryClient.invalidateQueries({ queryKey: ['auth', 'session'] }).finally(() => { window.__privateGate.done = true })
      })
      await page.waitForFunction(() => window.__privateGate.arrivals > 0)
      await page.evaluate(async () => { await window.__privateProbe.login.mutateAsync({ email: 'bruno@example.com', password: 'vault1234' }) })
      await page.waitForFunction(() => window.__privateProbe.userId === 'user-bruno' &&
        window.__privateProbe.profile?.id === 'user-bruno' &&
        Array.isArray(window.__privateProbe.wallets) && Array.isArray(window.__privateProbe.favorites))
      const before = await snapshot(page)
      await release(page)
      const after = await snapshot(page)
      assert.equal(after.userId, 'user-bruno', 'an old session lookup must not roll back the completed login')
      assert.deepEqual(after.profile, before.profile)
      assert.deepEqual(after.wallets, before.wallets)
      assert.deepEqual(after.favorites, before.favorites)
    })
  })
}

for (const domain of ['profile', 'wallets', 'order']) {
  test(`late ${domain} query after login cannot replace the current user cache`, async () => {
    await withApp(async ({ page, api }) => {
      let orderId
      if (domain === 'order') {
        const wallets = (await api('/wallets')).data.wallets
        await api('/cart/items', 'POST', { nftId: 'aurora-001', editionId: 'aurora-001-a', quantity: 1 })
        const quote = (await api('/quotes', 'POST', {})).data.quote
        const result = await api('/orders', 'POST', { quoteId: quote.id, walletId: wallets[0].id, network: wallets[0].network, idempotencyKey: 'late-query-a' })
        assert.equal(result.status, 201)
        orderId = result.data.order.id
      }
      await mount(page, orderId)
      const path = domain === 'profile' ? '/profile' : domain === 'wallets' ? '/wallets' : `/orders/${orderId}`
      await installGate(page, 'get', path)
      await page.evaluate((domain) => {
        window.__privateProbe.queries[domain].refetch().finally(() => { window.__privateGate.done = true })
      }, domain)
      await page.waitForFunction(() => Boolean(window.__privateGate.result))
      await login(page, 'bruno')
      const before = await snapshot(page)
      await release(page)
      assert.deepEqual((await snapshot(page))[domain], before[domain])
      assert.equal((await snapshot(page)).profile.id, 'user-bruno')
    })
  })
}

test('late profile mutation after another user logs in cannot alter the profile cache or session', async () => {
  await withApp(async ({ page }) => {
    await mount(page)
    await installGate(page, 'patch', '/profile')
    await start(page, 'updateProfile', adaProfile)
    await login(page, 'bruno')
    const before = await snapshot(page)
    await release(page)
    const after = await snapshot(page)
    assert.equal(after.profile.id, 'user-bruno')
    assert.deepEqual(after.profile, before.profile)
    const session = await page.evaluate(async () => { const { queryClient } = await import('/src/api/queryClient.ts'); return queryClient.getQueryData(['auth', 'session']) })
    assert.equal(session.user.name, 'Bruno Vault', 'a previous profile response cannot rename the current user')
    assert.equal(session.user.email, 'bruno@example.com')
  })
})

test('A to B to A invalidates old callbacks while preserving the new A profile and session', async () => {
  await withApp(async ({ page, api }) => {
    await mount(page)
    await installGate(page, 'patch', '/profile')
    await start(page, 'updateProfile', adaProfile)
    await login(page, 'bruno')
    await login(page, 'ada')
    const fresh = { ...adaProfile, name: 'Ada sessao atual', bio: 'Atual' }
    assert.equal((await api('/profile', 'PATCH', fresh)).status, 200)
    await page.evaluate(async () => {
      const { queryClient } = await import('/src/api/queryClient.ts')
      await queryClient.invalidateQueries({ queryKey: ['auth', 'private'] })
      await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] })
    })
    await settled(page, false)
    assert.equal((await snapshot(page)).profile.name, fresh.name)
    await release(page)
    assert.equal((await snapshot(page)).profile.name, fresh.name)
    const name = await page.evaluate(async () => { const { queryClient } = await import('/src/api/queryClient.ts'); return queryClient.getQueryData(['auth', 'session']).user.name })
    assert.equal(name, fresh.name)
  })
})

for (const domain of ['profile', 'wallets', 'order']) {
  test(`prepopulated ${domain} cache for A cannot be consumed by B`, async () => {
    await withApp(async ({ page, api }) => {
      const profile = (await api('/profile')).data.profile
      const wallets = (await api('/wallets')).data.wallets
      await api('/cart/items', 'POST', { nftId: 'aurora-001', editionId: 'aurora-001-a', quantity: 1 })
      const quote = (await api('/quotes', 'POST', {})).data.quote
      const order = (await api('/orders', 'POST', { quoteId: quote.id, walletId: wallets[0].id, network: wallets[0].network, idempotencyKey: 'prepopulated-a' })).data.order
      await mount(page, order.id)
      await login(page, 'bruno')
      await page.evaluate(async ({ domain, profile, wallets, order }) => {
        const { queryClient } = await import('/src/api/queryClient.ts')
        const { queryKeys } = await import('/src/api/queryKeys.ts')
        const key = domain === 'profile' ? queryKeys.auth.profile('user-ada')
          : domain === 'wallets' ? queryKeys.wallets.list('user-ada')
            : queryKeys.orders.detail(order.id, 'user-ada')
        queryClient.setQueryData(key, domain === 'profile' ? profile : domain === 'wallets' ? wallets : order)
      }, { domain, profile, wallets, order })
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      const current = await snapshot(page)
      if (domain === 'profile') assert.equal(current.profile.id, 'user-bruno')
      if (domain === 'wallets') assert.equal(current.wallets.some((wallet) => wallets.some((old) => old.id === wallet.id)), false)
      if (domain === 'order') assert.equal(current.order, undefined, 'an old cache entry must never be exposed after a 404')
    })
  })
}

for (const fail of [false, true]) {
  test(`late favorite ${fail ? 'rollback' : 'success'} cannot transiently overwrite the next user favorites`, async () => {
    await withApp(async ({ page, api }) => {
      await mount(page)
      await installGate(page, 'put', '/favorites/aurora-001', fail)
      await start(page, 'setFavorite', { nftId: 'aurora-001', favorite: true })
      await login(page, 'bruno')
      await api('/favorites/pixel-reef-044', 'PUT', null)
      await page.evaluate(async () => {
        const { queryClient } = await import('/src/api/queryClient.ts')
        await queryClient.invalidateQueries({ queryKey: ['auth', 'private'] })
      })
      await settled(page, false)
      assert.deepEqual((await snapshot(page)).favorites, ['pixel-reef-044'])
      await page.evaluate(async () => {
        const { queryClient } = await import('/src/api/queryClient.ts')
        const { queryKeys } = await import('/src/api/queryKeys.ts')
        const key = JSON.stringify(queryKeys.favorites.list('user-bruno'))
        queryClient.getQueryCache().subscribe(({ query }) => {
          if (JSON.stringify(query.queryKey) === key && query.state.data) window.__privateGate.writes.push(structuredClone(query.state.data))
        })
      })
      await release(page)
      const writes = await page.evaluate(() => window.__privateGate.writes)
      assert(writes.every((value) => JSON.stringify(value) === JSON.stringify(['pixel-reef-044'])), 'even a transient old success or rollback must not leak into B')
      assert.deepEqual((await snapshot(page)).favorites, ['pixel-reef-044'])
    })
  })
}

test('a cart response after session expiry cannot populate the anonymous cart', async () => {
  await withApp(async ({ page, api }) => {
    await mount(page)
    await installGate(page, 'post', '/cart/items')
    await start(page, 'addCartItem', { nftId: 'aurora-001', editionId: 'aurora-001-a', quantity: 1 })
    await api('/auth/logout', 'POST')
    await page.evaluate(async () => { const { queryClient } = await import('/src/api/queryClient.ts'); await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] }) })
    await page.waitForFunction(() => window.__privateProbe.userId === null && window.__privateProbe.cart?.items.length === 0)
    await release(page)
    const current = await snapshot(page)
    assert.equal(current.cart.items.length, 0, 'the guest must never inherit the previous user cart')
    assert.equal(current.profile, undefined)
    assert.equal(current.wallets, undefined)
    assert.equal(current.order, undefined)
  })
})

test('same-user session revalidation preserves valid caches and accepts a legitimate pending profile response', async () => {
  await withApp(async ({ page }) => {
    await mount(page)
    await installGate(page, 'patch', '/profile')
    await start(page, 'updateProfile', adaProfile)
    await page.evaluate(async () => { const { queryClient } = await import('/src/api/queryClient.ts'); await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] }) })
    await release(page)
    assert.equal((await snapshot(page)).profile.name, adaProfile.name)
    const session = await page.evaluate(async () => { const { queryClient } = await import('/src/api/queryClient.ts'); return queryClient.getQueryData(['auth', 'session']) })
    assert.equal(session.user.id, 'user-ada')
    assert.equal(session.user.name, adaProfile.name)
  })
})
