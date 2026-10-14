import assert from 'node:assert/strict'
import { after, beforeEach, test } from 'node:test'
import { createServer } from 'vite'

const storage = new Map()
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key),
}
const server = await createServer({
  configFile: false,
  cacheDir: '/tmp/cart-review-vite-cache',
  resolve: { alias: { '@': `${process.cwd()}/src` } },
  server: { middlewareMode: true, ws: false, watch: null },
})
const cart = await server.ssrLoadModule('/src/mocks/cartState.ts')
const auth = await server.ssrLoadModule('/src/mocks/authState.ts')
const { nftFixtures } = await server.ssrLoadModule('/src/mocks/fixtures/nfts.ts')
const initial = structuredClone(nftFixtures)
const item = { nftId: 'aurora-001', editionId: 'aurora-001-a', quantity: 1 }
const itemId = 'aurora-001__aurora-001-a'
const value = result => { assert.equal(result.ok, true, JSON.stringify(result)); return result.data }
beforeEach(() => { storage.clear(); nftFixtures.splice(0, nftFixtures.length, ...structuredClone(initial)) })
after(() => server.close())

test('stock fixtures, separate editions, quantity validation and limits', () => {
  const owner = cart.getOwnerKey(null)
  assert.equal(value(cart.addCartItem(owner, {...item,quantity:5})).items[0].maxQuantity,5)
  assert.equal(cart.addCartItem(owner,item).status,409)
  assert.equal(value(cart.addCartItem(owner,{...item,editionId:'aurora-001-c'})).items.length,2)
  for (const quantity of [0,-1,1.5,NaN,Infinity,'2',null]) {
    assert.equal(cart.updateCartItem(owner,itemId,{quantity}).status,400)
    assert.equal(cart.addCartItem(owner,{...item,quantity}).status,400)
  }
  assert.equal(cart.addCartItem(owner,{...item,editionId:'aurora-001-b'}).status,409)
  assert.equal(value(cart.updateCartItem(owner,itemId,{quantity:2})).items[0].quantity,2)
})

test('API calculates decimal totals, applies and removes coupon; rejects expired coupon', () => {
  const owner=cart.getOwnerKey(null)
  value(cart.addCartItem(owner,{...item,quantity:2}))
  const discounted=value(cart.applyCoupon(owner,' save10 '))
  assert.deepEqual(discounted.totals,{subtotalEth:'2.4',discountEth:'0.24',networkFeeEth:'0.0324',totalEth:'2.1924'})
  assert.equal(cart.applyCoupon(owner,'EXPIRED').error.code,'EXPIRED_COUPON')
  assert.equal(cart.applyCoupon(owner,'invalid').error.code,'INVALID_COUPON')
  assert.equal(value(cart.applyCoupon(owner,null)).totals.totalEth,'2.436')
})

test('every successful cart change invalidates quotes and failed changes preserve them', () => {
  const owner=cart.getOwnerKey(null)
  assert.equal(cart.createQuote(owner).ok,false)
  value(cart.addCartItem(owner,item))
  for (const change of [
    ()=>cart.updateCartItem(owner,itemId,{quantity:2}),
    ()=>cart.applyCoupon(owner,'SAVE10'),
    ()=>cart.applyCoupon(owner,null),
    ()=>cart.addCartItem(owner,{...item,editionId:'aurora-001-c'}),
    ()=>cart.removeCartItem(owner,'aurora-001__aurora-001-c'),
  ]) {
    const quote=value(cart.createQuote(owner))
    assert.ok(cart.getStoredQuote(owner,quote.id))
    assert.equal(cart.getStoredQuote('user:someone-else',quote.id),null)
    assert.equal(cart.updateCartItem(owner,itemId,{quantity:100}).ok,false)
    assert.ok(cart.getStoredQuote(owner,quote.id))
    value(change())
    assert.equal(cart.getStoredQuote(owner,quote.id),null)
  }
})

test('merge caps stock, avoids duplicates, removes unavailable editions and clears guest', () => {
  const guest=cart.getOwnerKey(null), user=cart.getOwnerKey('user-ada')
  value(cart.addCartItem(guest,{...item,quantity:4}))
  value(cart.addCartItem(user,{...item,quantity:3}))
  value(cart.addCartItem(guest,{...item,editionId:'aurora-001-c'}))
  value(cart.addCartItem(user,{...item,editionId:'aurora-001-c'}))
  const userQuote=value(cart.createQuote(user)), guestQuote=value(cart.createQuote(guest))
  nftFixtures[0].editions[2].available=false
  cart.mergeGuestCartIntoUser('user-ada')
  const merged=value(cart.getCart(user))
  assert.equal(merged.items.length,1)
  assert.equal(merged.items[0].quantity,5)
  assert.equal(value(cart.getCart(guest)).items.length,0)
  assert.equal(cart.getStoredQuote(user,userQuote.id),null)
  assert.equal(cart.getStoredQuote(guest,guestQuote.id),null)
  cart.mergeGuestCartIntoUser('user-ada')
  assert.equal(value(cart.getCart(user)).items[0].quantity,5)
})

test('cart persists through session changes and each user keeps a separate cart', () => {
  const guest=cart.getOwnerKey(null)
  value(cart.addCartItem(guest,item))
  value(auth.loginUser({email:'ada@example.com',password:'collector123'}))
  const ada=cart.getOwnerKey(auth.getCurrentUserId())
  assert.equal(value(cart.getCart(ada)).items[0].quantity,1)
  auth.logoutUser()
  assert.equal(value(cart.getCart(cart.getOwnerKey(null))).items.length,0)
  value(auth.loginUser({email:'bruno@example.com',password:'vault1234'}))
  assert.equal(value(cart.getCart(cart.getOwnerKey(auth.getCurrentUserId()))).items.length,0)
  assert.equal(value(cart.getCart(ada)).items.length,1)
})
