// Start Vite with VITE_ENABLE_MOCKS=true. Uses an available Playwright installation.
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const page = await browser.newPage()
const errors = []
page.on('pageerror', e => errors.push(e.message))
const base = process.env.CART_TEST_URL || 'http://127.0.0.1:5173'
const inc = () => page.getByRole('button', { name: /Aumentar quantidade/ }).first()
const dec = () => page.getByRole('button', { name: /Diminuir quantidade/ }).first()
const quantity = async () => Number(await inc().locator('..').locator('span').innerText())
async function settled() {
  await page.waitForFunction(async () => {
    const {queryClient} = await import('/src/api/queryClient.ts')
    return queryClient.isMutating({mutationKey:['cart']}) === 0 && queryClient.isFetching({queryKey:['cart']}) === 0
  })
  await page.getByText('Totais confirmados pela API.').waitFor()
}
async function clickMutation(button) {
  const response = page.waitForResponse(r => r.url().includes('/api/cart/items') && r.request().method() !== 'GET')
  await button.click()
  await response
  await settled()
}
async function api(path, method = 'GET', body) {
  return page.evaluate(async ({path,method,body}) => {
    const r = await fetch('/api'+path, {method, headers:{'Content-Type':'application/json'}, ...(body === undefined ? {} : {body:JSON.stringify(body)})})
    return { status:r.status, data:await r.json() }
  }, {path,method,body})
}
async function totals() {
  const {data:{cart}} = await api('/cart')
  for (const [label,key] of [['Subtotal','subtotalEth'],['Desconto','discountEth'],['Taxa de rede','networkFeeEth'],['Total','totalEth']]) {
    const text = await page.locator('dl > div').filter({has:page.locator('dt',{hasText:new RegExp('^'+label+'$')})}).locator('dd').innerText()
    assert.equal(text, `${key === 'discountEth' ? '-' : ''}${cart.totals[key]} ETH`)
  }
}
async function mockFailure(method, url, network = false, wait = 500) {
  await page.evaluate(async ({method,url,network,wait}) => {
    const resource = performance.getEntriesByType('resource').find(e => e.name.includes('/src/api/http/client.ts'))
    const {apiClient} = await import(resource.name)
    const id = apiClient.interceptors.request.use(async config => {
      const match = url.endsWith('/:itemId') ? config.url?.startsWith(url.replace('/api','').replace('/:itemId','/')) : config.url === url.replace('/api','')
      if (config.method === method && match) {
        apiClient.interceptors.request.eject(id)
        if (method === 'get') config.params = {...config.params, scenario:network ? 'network-error' : 'error'}
        else config.data = {...config.data, scenario:network ? 'network-error' : 'error'}
        await new Promise(resolve=>setTimeout(resolve,wait))
      }
      return config
    })
  }, {method,url,network,wait})
}
async function addAurora() {
  await page.goto(base+'/nft/aurora-001')
  await page.getByRole('button',{name:'Adicionar',exact:true}).click()
  await page.getByRole('status').filter({hasText:'NFT adicionado'}).waitFor()
  await page.getByRole('link',{name:'Ver carrinho'}).click()
  await settled()
}
async function login(email,password) {
  await page.goto(base+'/login?redirect=%2Fcart')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha',{exact:true}).fill(password)
  await page.getByRole('button',{name:'Entrar',exact:true}).click()
  await page.waitForURL(base+'/cart')
  await page.getByRole('heading',{name:/Revise seus NFTs/}).waitFor()
}
try {
  await addAurora()
  assert.equal(await quantity(),1)
  assert.equal(await dec().isDisabled(),true)
  await clickMutation(inc()); assert.equal(await quantity(),2); await totals()
  await clickMutation(dec()); assert.equal(await quantity(),1)
  for (let i=1;i<5;i++) { await clickMutation(inc()) }
  assert.equal(await quantity(),5); assert.equal(await inc().isDisabled(),true)
  assert.equal((await api('/cart/items/aurora-001__aurora-001-a','PATCH',{quantity:6})).status,409)
  assert.equal((await api('/cart/items/aurora-001__aurora-001-a','PATCH',{quantity:1.5})).status,400)
  for (let i=5;i>1;i--) { await clickMutation(dec()) }
  console.log('PASS UI add, increment/decrement, stock limits, integer validation, API totals')
  for (const network of [false,true]) {
    await mockFailure('patch','/api/cart/items/:itemId',network)
    await inc().click()
    await page.getByText('Atualizando carrinho e totais...').waitFor()
    assert.equal(await quantity(),2, 'optimistic quantity before response')
    await page.getByRole('alert').waitFor()
    await settled()
    assert.equal(await quantity(),1, 'rollback restores previous quantity')
    await clickMutation(inc()); assert.equal(await quantity(),2)
    assert.equal(await page.getByRole('alert').count(),0)
    await clickMutation(dec())
  }
  console.log('PASS HTTP and connection failures: visible feedback, optimistic state, rollback, retry')
  await page.getByLabel('Cupom',{exact:true}).fill('EXPIRED')
  await page.getByRole('button',{name:'Aplicar',exact:true}).click()
  await page.getByRole('alert').filter({hasText:'Cupom expirado'}).waitFor()
  await page.getByLabel('Cupom',{exact:true}).fill('SAVE10')
  await clickMutation(page.getByRole('button',{name:'Aplicar',exact:true})); await totals()
  assert.equal((await api('/cart')).data.cart.coupon.code,'SAVE10')
  await clickMutation(page.getByRole('button',{name:'Remover',exact:true})); await totals()
  assert.equal((await api('/cart')).data.cart.coupon,null)
  console.log('PASS UI coupon apply/remove, expired coupon, authoritative totals')
  await page.reload(); await settled(); assert.equal(await quantity(),1)
  // Verify every successful cart mutation invalidates stored quotes; failed changes preserve them.
  for (const change of [
    ()=>api('/cart/items/aurora-001__aurora-001-a','PATCH',{quantity:2}),
    ()=>api('/cart/items','PATCH',{couponCode:'SAVE10'}),
    ()=>api('/cart/items','PATCH',{couponCode:null}),
    ()=>api('/cart/items','POST',{nftId:'aurora-001',editionId:'aurora-001-c',quantity:1}),
    ()=>api('/cart/items/aurora-001__aurora-001-c','DELETE'),
  ]) {
    const {data:{quote}} = await api('/quotes','POST',{})
    assert.ok(quote.id)
    await change()
    assert.equal(await page.evaluate(id => Boolean(JSON.parse(localStorage.getItem('nft-marketplace.cart-state.v1')).quotes[id]),quote.id),false)
  }
  await page.reload(); await settled(); assert.equal(await quantity(),2)
  console.log('PASS refresh persistence; quote invalidation after quantity, coupon, add and remove')
  await login('ada@example.com','collector123'); await settled(); assert.equal(await quantity(),2)
  await page.getByRole('button',{name:'Sair',exact:true}).click(); await page.waitForURL(base+'/')
  await page.goto(base+'/cart'); await page.getByRole('heading',{name:'Carrinho vazio'}).waitFor()
  await login('bruno@example.com','vault1234'); await page.getByRole('heading',{name:'Carrinho vazio'}).waitFor()
  await page.getByRole('button',{name:'Sair',exact:true}).click(); await page.waitForURL(base+'/')
  await addAurora()
  await login('ada@example.com','collector123'); await settled(); assert.equal(await quantity(),3)
  assert.equal((await api('/cart')).data.cart.items.length,1)
  console.log('PASS login merge without duplicates, logout guest empty, user isolation, return to prior user')
  for (const width of [320,375,768,1440]) {
    await page.setViewportSize({width,height:900})
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true,`no overflow at ${width}px`)
  }
  await page.screenshot({path:'/tmp/cart-review-mobile.png',fullPage:true})
  await page.getByRole('button',{name:/Remover Aurora/}).click()
  await page.getByRole('heading',{name:'Carrinho vazio'}).waitFor()
  console.log('PASS responsive widths 320/375/768/1440, UI remove and empty state')
  // Delay a cart read to inspect its loading skeleton, then return a persistent HTTP error.
  await page.evaluate(async()=>{
    const resource=performance.getEntriesByType('resource').find(e=>e.name.includes('/src/mocks/browser.ts'))
    const {worker}=await import(resource.name)
    const source=await (await fetch('/src/mocks/handlers.ts')).text()
    const {http,HttpResponse,delay}=await import(source.match(/from ["']([^"']*\/msw\.js[^"']*)/)[1])
    worker.use(http.get('/api/cart',async()=>{await delay(800); return HttpResponse.json({message:'Erro de leitura de teste'},{status:400})}))
    const {queryClient}=await import('/src/api/queryClient.ts')
    void queryClient.resetQueries({queryKey:['cart']})
  })
  await page.getByRole('status',{name:'Carregando carrinho'}).waitFor()
  await page.getByRole('heading',{name:'Nao foi possivel carregar o carrinho'}).waitFor()
  await page.evaluate(async()=>{
    const resource=performance.getEntriesByType('resource').find(e=>e.name.includes('/src/mocks/browser.ts'))
    const {worker}=await import(resource.name)
    worker.resetHandlers()
  })
  await page.getByRole('button',{name:'Tentar novamente'}).click()
  await page.getByRole('heading',{name:'Carrinho vazio'}).waitFor()
  assert.deepEqual(errors,[])
  console.log('PASS loading skeleton, read error and recovery; no uncaught browser errors')
} catch (error) { console.log('FAIL UI',await page.locator('main').innerText()); throw error } finally { await browser.close() }
