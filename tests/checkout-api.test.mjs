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
const vite = await createServer({
  configFile: false,
  cacheDir: '/tmp/checkout-api-vite-cache',
  resolve: { alias: { '@': `${process.cwd()}/src` } },
  server: { middlewareMode: true, ws: false, watch: null },
})
const { handlers } = await vite.ssrLoadModule('/src/mocks/handlers.ts')
const { nftFixtures } = await vite.ssrLoadModule('/src/mocks/fixtures/nfts.ts')
for (const handler of handlers) {
  if (handler.info?.path) handler.info.path = new URL(handler.info.path, 'http://localhost').href
}
const msw = setupServer(...handlers)
msw.listen({onUnhandledRequest: 'error'})
const fixture = structuredClone(nftFixtures)
after(async () => { msw.close(); await vite.close() })
beforeEach(() => { storage.clear(); nftFixtures.splice(0,nftFixtures.length,...structuredClone(fixture)) })

async function api(path, method='GET', body) {
  const response = await fetch(`http://localhost/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const data = await response.json()
  return {status:response.status, data}
}
async function setup() {
  const login=await api('/auth/login','POST',{email:'ada@example.com',password:'collector123'})
  assert.equal(login.status,200)
  const wallets=await api('/wallets')
  assert.equal(wallets.status,200)
  const item=await api('/cart/items','POST',{nftId:'aurora-001',editionId:'aurora-001-a',quantity:2})
  assert.equal(item.status,200)
  const quote=await api('/quotes','POST',{})
  assert.equal(quote.status,200)
  const payload={quoteId:quote.data.quote.id,walletId:wallets.data.wallets[0].id,network:'ethereum',idempotencyKey:'attempt-1'}
  return {payload,quote:quote.data.quote}
}

test('wallet REST validates edits, primary/secondary roles, persistence and user isolation',async()=>{
  await setup()
  const newWallet={label:'Reserva',address:'0x'+'1'.repeat(40),network:'polygon',kind:'secondary'}
  assert.equal((await api('/wallets','POST',{...newWallet,address:'invalid'})).status,400)
  assert.equal((await api('/wallets','POST',{...newWallet,network:'invalid'})).status,400)
  const created=await api('/wallets','POST',newWallet)
  assert.equal(created.status,201)
  const id=created.data.wallet.id
  assert.equal((await api(`/wallets/${id}`,'PATCH',{label:'Reserva editada',kind:'primary'})).status,200)
  const current=await api('/wallets')
  assert.equal(current.data.wallets.find(w=>w.id===id).isDefault,true)
  assert.equal(current.data.wallets.filter(w=>w.isDefault).length,1)
  assert.equal((await api(`/wallets/${id}`,'PATCH',{status:'disconnected'})).status,200)
  assert.equal((await api(`/wallets/${id}`,'PATCH',{status:'unknown'})).status,400)
  assert.equal((await api('/wallets')).data.wallets.find(w=>w.id===id).status,'disconnected')
  await api('/auth/logout','POST')
  await api('/auth/login','POST',{email:'bruno@example.com',password:'vault1234'})
  assert.equal((await api('/wallets')).data.wallets.some(w=>w.id===id),false)
  assert.equal((await api(`/wallets/${id}`,'PATCH',{label:'Invasao'})).status,404)
})

test('confirmed order is idempotent, rejects a different payload and preserves its snapshot',async()=>{
  const {payload}=await setup()
  const first=await api('/orders','POST',payload)
  assert.equal(first.status,201)
  assert.equal(first.data.order.status,'confirmed')
  const orderId=first.data.order.id
  assert.equal((await api('/orders','POST',payload)).data.order.id,orderId)
  assert.equal((await api('/orders','POST',{...payload,network:'polygon'})).status,409)
  assert.equal((await api('/orders','POST',{...payload,idempotencyKey:'new-invalid',network:'unknown'})).status,400)
  assert.equal((await api('/orders','POST',{...payload,network:'polygon',scenario:'timeout-before-create'})).status,409)
  assert.equal((await api('/cart')).data.cart.items.length,0)
  assert.equal((await api('/cart/items','POST',{nftId:'aurora-001',editionId:'aurora-001-a',quantity:1})).status,200)
  assert.equal((await api('/orders','POST',payload)).data.order.id,orderId)
  assert.equal((await api('/cart')).data.cart.items[0].quantity,1)
  nftFixtures[0].priceEth='99.99'
  const receipt=await api(`/orders/${orderId}`)
  assert.equal(receipt.data.order.items[0].unitPriceEth,'1.2')
  assert.equal(receipt.data.order.totals.totalEth,first.data.order.totals.totalEth)
  assert.ok(receipt.data.order.transactionId)
  await api('/auth/logout','POST')
  await api('/auth/login','POST',{email:'bruno@example.com',password:'vault1234'})
  assert.equal((await api(`/orders/${orderId}`)).status,404)
  assert.equal((await api('/orders/attempts/attempt-1')).status,404)
})

test('timeout before and after creation recover the same logical attempt',async()=>{
  const {payload}=await setup()
  await assert.rejects(api('/orders','POST',{...payload,scenario:'timeout-before-create'}))
  assert.equal((await api('/orders/attempts/attempt-1')).status,404)
  assert.equal((await api('/orders','POST',{...payload,scenario:'timeout-before-create'})).status,201)
  await api('/__mock/reset-auth','POST')
  const {payload:afterPayload}=await setup()
  await assert.rejects(api('/orders','POST',{...afterPayload,scenario:'timeout-after-create'}))
  const recovered=await api('/orders/attempts/attempt-1')
  assert.equal(recovered.status,200)
  assert.equal(recovered.data.order.status,'confirmed')
  assert.equal((await api('/orders','POST',{...afterPayload,scenario:'timeout-after-create'})).data.order.id,recovered.data.order.id)
  assert.equal((await api('/cart')).data.cart.items.length,0)
})

test('pending order progresses in mock API, clears cart once, and terminal states stay terminal',async()=>{
  const {payload}=await setup()
  const created=await api('/orders','POST',{...payload,scenario:'pending'})
  assert.equal(created.data.order.status,'pending')
  assert.equal((await api('/cart')).data.cart.items[0].quantity,2)
  const id=created.data.order.id
  assert.equal((await api(`/orders/${id}`)).data.order.status,'pending')
  assert.equal((await api(`/orders/${id}`)).data.order.status,'confirmed')
  assert.equal((await api('/cart')).data.cart.items.length,0)
  assert.equal((await api(`/orders/${id}`)).data.order.status,'confirmed')
  assert.equal((await api('/orders','POST',payload)).data.order.id,id)
})

test('declined, expired, changed, sold out and disconnected wallet outcomes',async()=>{
  const {payload,quote}=await setup()
  const declined=await api('/orders','POST',{...payload,scenario:'declined'})
  assert.equal(declined.data.order.status,'declined')
  assert.equal((await api('/cart')).data.cart.items.length,1)
  assert.equal((await api(`/orders/${declined.data.order.id}`)).data.order.status,'declined')
  assert.equal((await api('/orders','POST',{...payload,idempotencyKey:'attempt-2',scenario:'price-change'})).status,409)
  assert.equal((await api('/orders','POST',{...payload,idempotencyKey:'attempt-3',scenario:'sold-out'})).status,409)
  assert.equal((await api('/orders','POST',{...payload,idempotencyKey:'attempt-4',scenario:'quote-expired'})).status,409)
  assert.equal((await api(`/wallets/${payload.walletId}`,'PATCH',{status:'disconnected'})).status,200)
  assert.equal((await api('/orders','POST',{...payload,idempotencyKey:'attempt-5'})).status,409)
  assert.equal((await api(`/quotes/${quote.id}`)).status,200)
  assert.equal((await api('/orders','POST',{...payload,idempotencyKey:'attempt-6',scenario:'error'})).status,500)
  assert.equal((await api('/orders','POST',{...payload,idempotencyKey:'attempt-7',scenario:'session-expired'})).status,401)
})

test('session expiration preserves quote and key for retry after login',async()=>{
  const {payload,quote}=await setup()
  assert.equal((await api('/orders','POST',{...payload,scenario:'session-expired'})).status,401)
  assert.equal((await api('/auth/session')).data,null)
  await api('/auth/login','POST',{email:'ada@example.com',password:'collector123'})
  assert.equal((await api(`/quotes/${quote.id}`)).status,200)
  const retried=await api('/orders','POST',{...payload,scenario:'session-expired'})
  assert.equal(retried.status,201)
  assert.equal(retried.data.order.status,'confirmed')
})

test('reset restores deterministic auth, wallets, cart and order state',async()=>{
  const {payload}=await setup()
  assert.equal((await api('/orders','POST',payload)).status,201)
  assert.equal((await api('/__mock/reset-auth','POST')).status,200)
  assert.equal((await api('/auth/session')).data,null)
  await api('/auth/login','POST',{email:'ada@example.com',password:'collector123'})
  assert.equal((await api('/cart')).data.cart.items.length,0)
  assert.equal((await api('/orders/attempts/attempt-1')).status,404)
  assert.equal((await api('/wallets')).data.wallets.length,1)
})
