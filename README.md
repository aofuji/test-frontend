# NFT Marketplace — test-frontend

Marketplace demonstrativo em React, TypeScript e Vite. Catálogo, conta, carrinho, carteiras, checkout e pedidos usam APIs REST simuladas por MSW no próprio navegador. Não há blockchain ou pagamento real. O [enunciado oficial](docs/desafio-frontend.md), o [checklist de progresso](docs/implementation-checklist.md) e a [arquitetura](docs/ARCHITECTURE.md) ficam em `docs`.

## Execução local

Requer Node.js compatível com Vite 8 e npm. Em um checkout limpo:

```bash
npm ci
VITE_ENABLE_MOCKS=true npm run dev
```

Abra a URL exibida pelo Vite. `VITE_ENABLE_MOCKS=true` é necessário para iniciar o worker MSW. Para conferir o build de demonstração com mocks:

```bash
VITE_ENABLE_MOCKS=true npm run build
npm run preview
```

As contas fictícias são `ada@example.com` / `collector123` e `bruno@example.com` / `vault1234`. O cadastro também aceita novos usuários. O estado simulado é persistido no `localStorage` deste navegador; para voltar às fixtures iniciais, execute no console da aplicação:

```js
await fetch('/api/__mock/reset-auth', { method: 'POST' })
location.reload()
```

Esse reset limpa sessões, carrinhos, cotações, carteiras, pedidos e a tentativa de checkout. É uma rota de demonstração, não uma API de produção.

## Reproduzir checkout e falhas

Adicione um NFT disponível, entre em uma conta e abra `/checkout`. O primeiro clique em **Confirmar compra** gera uma cotação para revisão; o segundo envia o pedido. Em **Cenário determinístico**, escolha confirmação, recusa, pendência, timeout antes/depois da criação, cotação expirada, preço alterado, NFT esgotado, sessão expirada ou erro HTTP 500. A tentativa e sua chave persistem após refresh. Os timeouts de criação falham na primeira chamada da tentativa; repetir a mesma tentativa ou recarregar permite recuperá-la. O pedido pendente evolui na API simulada após leituras do recibo. Carteiras podem ser cadastradas, editadas, conectadas, desconectadas e promovidas a principais em `/wallets`.

Os [contratos REST, política de idempotência e limitações](docs/etapa-6-checkout.md) estão documentados separadamente. A mudança de payload usando uma chave já usada devolve HTTP 409. Os testes de endpoint reproduzem esse conflito e conferem que pedidos não são duplicados.

## Verificação

```bash
npx tsc -b --pretty false
npm run lint
npm run build
npm run test:cart
npm run test:checkout
```

Com Vite iniciado com mocks, `npm run test:checkout:browser` testa os fluxos no Chrome via Playwright. `npm run test:cart:browser` testa o carrinho. Playwright não está no `package.json` atual: os scripts usam uma instalação acessível via `PLAYWRIGHT_MODULE`, o Chrome indicado por `CHROME_PATH` e a URL opcional `CHECKOUT_TEST_URL` ou `CART_TEST_URL`. A ausência dessa dependência declarada e da suíte E2E completa é uma pendência do [checklist](docs/implementation-checklist.md).

Socket.IO, favoritos, edição de perfil, regressão visual ampla, auditoria Lighthouse e deploy continuam pendentes no desafio completo. O arquivo Figma não está disponível neste repositório, portanto fidelidade aos frames oficiais não foi avaliada.
