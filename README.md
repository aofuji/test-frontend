# NFT Marketplace — test-frontend

Marketplace demonstrativo em React, TypeScript e Vite. Catálogo, conta, carrinho, carteiras, checkout e pedidos usam APIs REST simuladas por MSW no próprio navegador. Não há blockchain ou pagamento real. O [enunciado oficial](docs/desafio-frontend.md), o [checklist de progresso](docs/implementation-checklist.md) e a [arquitetura](docs/ARCHITECTURE.md) ficam em `docs`.

A Home traz NFTs em destaque da mesma API do catálogo. O detalhe tem galeria com imagem principal, miniaturas e seleção por teclado. As ilustrações SVG são provisórias porque o Figma não está disponível neste repositório.

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

Esse reset limpa sessões, perfis, favoritos, NFTs alterados, carrinhos, cotações, carteiras, pedidos, conexões de teste e a tentativa de checkout. É uma rota de demonstração, não uma API de produção.

## Perfil e favoritos

Após login, `/profile` permite editar nome, e-mail, bio, categorias favoritas e avatar PNG/JPEG/WebP de até 256 KB, além de alterar a senha informando a atual. As mudanças confirmadas permanecem após refresh. O botão de coração no catálogo e no detalhe salva favoritos por usuário. Para visitantes, ele abre o login e retoma a ação no NFT de origem. Os endpoints são `GET/PATCH /api/profile`, `POST /api/profile/password`, `GET /api/favorites` e `PUT/DELETE /api/favorites/:nftId`.

Para reproduzir um rollback de favorito, entre em uma conta e execute no console antes de clicar no coração:

```js
await fetch('/api/__mock/favorites/fail-next', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'error' }),
})
```

Use `type: 'network-error'` para simular falha de conexão. A ação aparece imediatamente e volta ao estado anterior quando a mutation falha. O hash de senha e o armazenamento local são exclusivos desta simulação; não substituem autenticação de servidor.

Para testar erro de leitura do perfil, com sessão ativa execute `await fetch('/api/__mock/profile/read-failure', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: true }) })` e recarregue `/profile`. Desative com o mesmo comando e `enabled: false` antes de clicar em **Tentar novamente**. O reset geral também desativa esse cenário.

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
npm run test:profile
npm run test:profile:browser
npm run test:cart:browser
npm run test:checkout:browser
npm run test:realtime:browser
git diff --check
```

Com Vite iniciado com mocks, `npm run test:profile:browser` testa perfil, favoritos, destaques, galeria, URL, paginação, histórico, teclado, foco, reflow e movimento reduzido. `npm run test:cart:browser` testa o carrinho e requer o servidor de desenvolvimento, pois importa o `queryClient` por `/src`. As suítes de checkout e tempo real também funcionam no preview com `CHECKOUT_TEST_URL` e `REALTIME_TEST_URL`; a suíte nova aceita `PROFILE_TEST_URL`. Playwright não está no `package.json` atual: os scripts usam uma instalação acessível via `PLAYWRIGHT_MODULE`, o Chrome indicado por `CHROME_PATH` e a URL opcional de cada suíte. A ausência dessa dependência declarada e da suíte E2E completa é uma pendência do [checklist](docs/implementation-checklist.md).

Regressão visual ampla, auditoria Lighthouse e deploy continuam pendentes no desafio completo. O arquivo Figma não está disponível neste repositório, portanto fidelidade aos frames oficiais não foi avaliada. O preview local com mocks passou cinco execuções consecutivas da suíte Socket.IO após a correção da reconexão; a publicação real ainda não foi verificada.
