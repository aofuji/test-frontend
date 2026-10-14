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

Esse reset limpa sessões, NFTs alterados, carrinhos, cotações, carteiras, pedidos, conexões de teste e a tentativa de checkout. É uma rota de demonstração, não uma API de produção.

## Tempo real simulado

Com mocks ativos, `socket.io-client` conecta por WebSocket à mesma origem. O MSW intercepta o transporte Socket.IO, enquanto os endpoints REST continuam sendo a fonte dos dados. Para reproduzir uma alteração de preço e estoque com o navegador aberto, execute no console:

```js
await fetch('/api/__mock/realtime/nft', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nftId: 'aurora-001', editionId: 'aurora-001-a', priceEth: '1.44', stock: 1 }),
})
```

O carrinho e o catálogo se atualizam, e uma cotação anterior precisa ser refeita. Use `delivery: 'duplicate'`, `'old'` ou `'out-of-order'` no corpo para cenários de ordenação. Para desconectar e reconectar o mock, envie `{ disconnected: true }` e depois `{ disconnected: false }` para `POST /api/__mock/realtime/connection`; na volta, o cliente reconcilia dados ativos pela API REST. `POST /api/__mock/realtime/order` recebe `{ orderId, status: 'confirmed' | 'declined' }` para concluir um pedido pendente pertencente à sessão. Para mantê-lo pendente até esse comando, crie o pedido via REST com `scenario: 'pending-manual'`. `POST /api/__mock/reset-auth` e refresh restauram o cenário inicial. Esses endpoints são exclusivos da demonstração. O protocolo e seus limites estão em [ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Reproduzir checkout e falhas

Adicione um NFT disponível, entre em uma conta e abra `/checkout`. O primeiro clique em **Confirmar compra** gera uma cotação para revisão; o segundo envia o pedido. Em **Cenário determinístico**, escolha confirmação, recusa, pendência, timeout antes/depois da criação, cotação expirada, preço alterado, NFT esgotado, sessão expirada ou erro HTTP 500. A tentativa e sua chave persistem após refresh. Os timeouts de criação falham na primeira chamada da tentativa; repetir a mesma tentativa ou recarregar permite recuperá-la. O pedido pendente evolui na API simulada e avisa o recibo por Socket.IO. Carteiras podem ser cadastradas, editadas, conectadas, desconectadas e promovidas a principais em `/wallets`.

Os [contratos REST, política de idempotência e limitações](docs/etapa-6-checkout.md) estão documentados separadamente. A mudança de payload usando uma chave já usada devolve HTTP 409. Os testes de endpoint reproduzem esse conflito e conferem que pedidos não são duplicados.

## Verificação

```bash
npx tsc -b --pretty false
npm run lint
npm run build
npm run test:cart
npm run test:checkout
npm run test:realtime:browser
```

Com Vite iniciado com mocks, `npm run test:checkout:browser` testa os fluxos no Chrome via Playwright. `npm run test:cart:browser` testa o carrinho e requer o servidor de desenvolvimento, pois importa o `queryClient` por `/src`. `npm run test:realtime:browser` verifica o transporte Socket.IO e também funciona no preview com `REALTIME_TEST_URL`. Playwright não está no `package.json` atual: os scripts usam uma instalação acessível via `PLAYWRIGHT_MODULE`, o Chrome indicado por `CHROME_PATH` e a URL opcional de cada suíte. A ausência dessa dependência declarada e da suíte E2E completa é uma pendência do [checklist](docs/implementation-checklist.md).

Favoritos, edição de perfil, regressão visual ampla, auditoria Lighthouse e deploy continuam pendentes no desafio completo. O arquivo Figma não está disponível neste repositório, portanto fidelidade aos frames oficiais não foi avaliada.
