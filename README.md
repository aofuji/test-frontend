# NFT Marketplace — test-frontend

Marketplace demonstrativo em React, TypeScript e Vite. Catálogo, conta, carrinho, carteiras, checkout e pedidos usam APIs REST simuladas por MSW no próprio navegador. Não há blockchain ou pagamento real. As decisões técnicas e os contratos estão na [arquitetura](docs/ARCHITECTURE.md); as verificações e pendências estão na [revisão de entrega](docs/delivery-review.md).

A Home traz NFTs em destaque da mesma API do catálogo. O detalhe tem galeria com imagem principal, miniaturas e seleção por teclado. A referência visual é o Figma fornecido no desafio. Os assets usados pela aplicação permanecem em `public/`.

## Execução local

Requer **Node.js 22.19+** (ou Node.js 24+) e npm. O mínimo considera Vite e Lighthouse. Em um checkout limpo:

```bash
npm ci
npm run dev
```

Abra a URL exibida pelo Vite. O `.env` versionado contém `VITE_ENABLE_MOCKS=true`: desenvolvimento e build de demonstração usam o worker MSW existente sem configuração manual. O arquivo não contém segredos. Para conferir o build:

```bash
npm run build
npm run preview
```

O `.env.example` lista a variável da aplicação e os overrides opcionais das ferramentas. Para personalizar, copie-o para `.env.local`, ignorado pelo Git. Nunca coloque credenciais reais em variáveis `VITE_*`, que são públicas no bundle.

### Variáveis de ambiente

| Variável | Valor | Uso |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `true` | Ativa os handlers MSW no desenvolvimento e no build de demonstração. |

Não há chaves externas nem serviços obrigatórios. Uma variável de ambiente ou `.env.local` pode sobrescrever o padrão. `VITE_ENABLE_MOCKS=false` desativa a simulação, mas este projeto não fornece um backend real. A variável é incorporada no build: mudar o ambiente apenas no `preview` não altera um `dist` já gerado.

As contas fictícias são `ada@example.com` / `collector123` e `bruno@example.com` / `vault1234`. O cadastro também aceita novos usuários. O estado simulado é persistido no `localStorage` deste navegador; para voltar às fixtures iniciais, execute no console da aplicação:

```js
await fetch('/api/__mock/reset-auth', { method: 'POST' })
location.reload()
```

Esse reset limpa sessões, perfis, favoritos, NFTs alterados, carrinhos, cotações, carteiras, pedidos, conexões de teste e a tentativa de checkout. É uma rota de demonstração, não uma API de produção.

### Seleção de cenários

Os cenários de catálogo são mantidos no parâmetro `scenario` da URL. Exemplos:

```text
/?scenario=normal
/?scenario=latency
/?scenario=error
/?scenario=empty
```

O controle de cenário não faz parte da interface pública; use a URL ou os endpoints de demonstração descritos abaixo. Carrinho e checkout possuem cenários próprios documentados nas seções correspondentes.

## Perfil e favoritos

Após login, `/profile` permite editar nome, e-mail, bio, categorias favoritas e avatar PNG/JPEG/WebP de até 256 KB, além de alterar a senha informando a atual. As mudanças confirmadas permanecem após refresh. O botão de coração no detalhe salva favoritos por usuário; a Home mobile oferece o painel de favoritos. Para visitantes, a ação do detalhe abre o login e retoma o NFT de origem. Os endpoints são `GET/PATCH /api/profile`, `POST /api/profile/password`, `GET /api/favorites` e `PUT/DELETE /api/favorites/:nftId`.

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

Adicione um NFT disponível, entre em uma conta e abra `/checkout`. O primeiro clique em **Confirmar compra** gera uma cotação para revisão; o segundo envia o pedido. No servidor de desenvolvimento, em viewport desktop, abra **Cenário determinístico** e escolha confirmação, recusa, pendência, timeout antes/depois da criação, cotação expirada, preço alterado, NFT esgotado, sessão expirada ou erro HTTP 500. Os controles técnicos ficam ocultos no mobile e no build de produção; os endpoints de cenário continuam disponíveis com MSW ativo. A tentativa e sua chave persistem após refresh. Os timeouts de criação falham na primeira chamada da tentativa; repetir a mesma tentativa ou recarregar permite recuperá-la. O pedido pendente evolui na API simulada e avisa o recibo por Socket.IO. Carteiras podem ser cadastradas, editadas, conectadas, desconectadas e promovidas a principais em `/wallets`.

Os [contratos REST, política de idempotência e limitações](docs/ARCHITECTURE.md#carteiras-cotações-e-pedidos-contratos-rest) estão consolidados na arquitetura. A mudança de payload usando uma chave já usada devolve HTTP 409. Os testes de endpoint reproduzem esse conflito e conferem que pedidos não são duplicados.

## Verificação

| Comando | Resultado |
| --- | --- |
| `npm run dev` | Inicia Vite com MSW, conforme o `.env`. |
| `npm run build` | Verifica TypeScript e gera `dist/` com os mocks de demonstração. |
| `npm run preview` | Serve o `dist/` existente; execute o build antes. |
| `npm run typecheck` | Executa `tsc -b --pretty false`. |
| `npm run lint` | Executa o ESLint existente. |
| `npm run test` | Executa todas as suítes de API/estado e Playwright existentes. Inicia e encerra Vite com mocks automaticamente. |
| `npm run lighthouse` | Gera o build, inicia um preview local temporário, audita a Home e encerra o servidor. |

### Playwright

O Playwright está declarado nas dependências de desenvolvimento; os scripts de navegador existentes foram reutilizados, sem criar outra configuração ou suíte. Instale o Chromium uma vez após `npm ci`:

```bash
npx playwright install chromium
npm run typecheck
npm run lint
npm run test
```

Em Linux, o navegador também precisa das bibliotecas do sistema. Quando necessário, use `npx playwright install --with-deps chromium` em uma máquina onde você tenha permissão para instalar esses pacotes. Consulte a [instalação oficial de navegadores](https://playwright.dev/docs/browsers).

O executor descobre `tests/*.test.mjs` e `tests/*-browser.mjs`, roda as suítes sequencialmente e retorna código diferente de zero se alguma falhar. Não omite as suítes antigas. Cada processo recebe a URL do servidor temporário, cuja porta é alocada automaticamente. Para selecionar uma suíte:

```bash
npm run test -- auth-mobile
npm run test -- catalog-pagination
```

As cinco suítes antigas tiveram seus seletores atualizados, preservando verificações funcionais. A última execução completa aprovou **16/16 suítes**: 13 Playwright e 3 de API/estado (17 testes individuais de API), sem falhas ou testes ignorados. Isso não equivale a cobertura integral de cada requisito nem substitui regressão visual com baselines. O [relatório de revisão de entrega](docs/delivery-review.md) registra a validação de instalação limpa e as pendências do enunciado.

A auditoria de acessibilidade pode ser reproduzida com `npm run test -- accessibility-browser`: verifica teclado, foco, formulários e 31 análises axe em desktop/mobile, reutilizando o axe-core incluído no Lighthouse. O escopo e as limitações estão na [arquitetura](docs/ARCHITECTURE.md#acessibilidade); não substitui testes com leitores de tela reais.

Os comandos específicos `test:cart`, `test:checkout`, `test:profile` e `test:*:browser` continuam disponíveis. Os três primeiros dispensam navegador e servidor. Os comandos `test:*:browser` executados diretamente requerem um Vite já iniciado com mocks; a suíte de carrinho importa módulos por `/src` e precisa do servidor de desenvolvimento.

Alternativas opcionais:

- `CHROME_PATH`: caminho de um Chrome/Chromium já instalado, em vez do Chromium do Playwright. Exemplo em Linux: `CHROME_PATH=/usr/bin/google-chrome npm run test`.
- `PLAYWRIGHT_MODULE`: caminho de uma instalação externa, mantido por compatibilidade. Não é necessário após `npm ci`.
- `TEST_BASE_URL`: faz `npm run test` usar um servidor de desenvolvimento existente com mocks, sem iniciar outro. As suítes individuais continuam aceitando suas variáveis `AUTH_TEST_URL`, `CART_TEST_URL`, `CATALOG_TEST_URL`, `CHECKOUT_TEST_URL`, `HOME_TEST_URL`, `NFT_TEST_URL`, `PROFILE_TEST_URL`, `REALTIME_TEST_URL` e `WALLETS_TEST_URL`.

### Lighthouse

É necessário Google Chrome/Chromium instalado e executável no sistema. O Lighthouse CLI está nas dependências de desenvolvimento e sua versão fica fixada pelo `package-lock.json`. Consulte a [documentação oficial do CLI](https://github.com/GoogleChrome/lighthouse#using-the-node-cli).

```bash
npm run lighthouse
```

Se o navegador não for detectado automaticamente, informe seu caminho (exemplo em Linux):

```bash
CHROME_PATH=/usr/bin/google-chrome npm run lighthouse
```

A auditoria usa o **build de produção**, com MSW ativado pelo `.env`, e um preview em `http://127.0.0.1:<porta>/?scenario=normal`, em porta livre automaticamente. O perfil é mobile, headless, com throttling simulado e armazenamento limpo pelo Lighthouse; não usa o estado pessoal do navegador. São gerados `reports/lighthouse/home.report.html` e `reports/lighthouse/home.report.json`, sobrescritos na próxima execução e ignorados pelo Git. O comando falha em erros de execução; não impõe uma nota mínima. As notas podem variar conforme hardware, Chrome e carga da máquina. Para comparar resultados, use `npm ci`, a mesma versão do Chrome e o mesmo ambiente sem outros testes de navegador em paralelo.

Essa auditoria cobre a Home pública. Não representa uma auditoria de todas as rotas autenticadas nem valida publicação/deploy ou equivalência visual completa ao Figma.

### Entrega na Vercel

O `vercel.json` já contém o fallback SPA `/(.*)` → `/index.html`, conforme a [orientação oficial para Vite](https://vercel.com/docs/frameworks/frontend/vite). Ele permite ao TanStack Router resolver URLs diretas e refresh de `/nft/:id`, `/cart`, `/checkout`, `/orders/:id`, `/profile` e `/wallets`.

Configurações esperadas: preset **Vite**, instalação `npm ci`, build `npm run build`, saída `dist` e Node.js **24.x**. Mantenha `VITE_ENABLE_MOCKS=true` no ambiente de build da demonstração; `.env` já fornece esse padrão. Não é necessário backend, token de API nem conexão blockchain.

Nenhum deploy é feito por esses comandos locais. Antes de enviar o desafio, registre a URL pública e o commit publicado, teste acesso direto/refresh das rotas, autenticação, compra e Socket.IO na hospedagem. A configuração local correta não comprova que uma versão publicada funciona.
