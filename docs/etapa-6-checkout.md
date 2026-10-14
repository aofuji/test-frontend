# Etapa 6 — checkout, carteiras e pedidos simulados

Fonte dos requisitos: [desafio-frontend.md](desafio-frontend.md) e solicitação da Etapa 6. Esta documentação descreve o contrato efetivamente implementado. Toda resposta de negócio vem dos handlers MSW em `src/mocks/handlers.ts`, com contratos TypeScript em `src/api/types` e cliente Axios em `src/api`. Não há blockchain, extensão de carteira, gateway ou backend separado.

## Contratos REST

| Método e caminho | Requisição | Resposta de sucesso | Falhas principais |
| --- | --- | --- | --- |
| `GET /api/wallets` | Sessão ativa | `{ wallets: Wallet[] }` | 401 |
| `POST /api/wallets` | `label`, `address`, `network`, `kind?`, `isDefault?`, `scenario?` | 201 `{ wallet: Wallet }` | 400, 409, 500, conexão |
| `PATCH /api/wallets/:walletId` | Campos parciais e `status?` | `{ wallet: Wallet }` | 400, 401, 404, 409, 500, conexão |
| `POST /api/quotes` | `couponCode?`, `scenario?` | `{ quote: { id, cart, expiresAt } }` | 400, 409, 500, conexão |
| `GET /api/quotes/:quoteId` | ID da cotação do dono atual | `{ quote: Quote }` | 404 |
| `POST /api/orders` | `quoteId`, `walletId`, `network`, `idempotencyKey`, `scenario?` | 201 `{ order: Order }` | 400, 401, 404, 409, 500, conexão |
| `GET /api/orders/:orderId` | Sessão ativa, ID do pedido | `{ order: Order }` | 401, 404 |
| `GET /api/orders/attempts/:idempotencyKey` | Sessão ativa, chave da tentativa | `{ order: Order }` | 401, 404 |
| `POST /api/__mock/reset-auth` | Sem corpo | `{ ok: true }` | Restaura autenticação, carrinho, carteiras e pedidos ao estado inicial. |

`Wallet` contém ID, nome, endereço, rede (`ethereum`, `polygon`, `base`), tipo (`primary` ou `secondary`), status de conexão, indicador de principal e datas. O endereço EVM é validado no mock. Cada usuário mantém sua lista separada no `localStorage`. A carteira principal é única; alterar o tipo para principal promove a carteira selecionada. A carteira deve estar conectada para confirmar um pedido.

`Order` contém ID, estado, referência fictícia da transação, ID da cotação, snapshot da carteira e dos itens, cupom e totais, rede e datas. Valores ETH são strings decimais. O snapshot é feito no momento da criação e não volta a consultar preços de catálogo para mostrar o recibo.

## Idempotência, cotação e persistência

A cotação dura cinco minutos e pertence ao carrinho do usuário atual. `POST /api/orders` primeiro busca uma tentativa já registrada por usuário e chave. Payload idêntico (`quoteId`, `walletId`, `network`) devolve o mesmo pedido; payload diferente devolve `409 IDEMPOTENCY_CONFLICT`. Os cenários de teste não fazem parte da identidade da compra. Antes de criar um pedido, o mock confere expiração, preço, disponibilidade, itens, cupom, totais e carteira. Uma divergência rejeita a compra e exige nova cotação e revisão.

A interface grava `userId`, `quoteId`, chave, carteira, rede e cenário em `nft-marketplace.checkout-attempt.v1`. Após refresh ou login, consulta primeiro o pedido pela chave. Se ainda não foi criado, recupera a cotação e reutiliza a chave. O estado da API fica em `nft-marketplace.order-state.v1`; carteiras em `nft-marketplace.wallet-state.v1`; carrinho e cotações em `nft-marketplace.cart-state.v1`. Tudo é local ao navegador, sem persistência entre dispositivos. A API faz o isolamento por usuário. Logout limpa o cache privado do TanStack Query; a tentativa só é usada quando o `userId` coincide.

No timeout antes da criação não há pedido; a primeira chamada falha e a mesma tentativa pode ser reenviada após refresh. No timeout após a criação, a primeira chamada falha na rede, mas o pedido já existe no estado MSW; consultar pela chave ou reenviar o mesmo payload retorna o mesmo ID. Pedidos confirmados debitam do carrinho as quantidades do snapshot uma única vez por ID, com registro persistente de aplicação. Itens adicionais do carrinho não são removidos pelo helper de débito. Pedidos recusados e erros mantêm os itens. Após uma resposta de confirmação ou a evolução posterior de um pedido pendente, o cliente invalida o prefixo de todas as chaves de carrinho, incluindo a do usuário autenticado.

## Estados de pagamento

- `confirmed`: terminal, com transação fictícia e recibo; aparece só depois de resposta da API.
- `declined`: terminal, sem transação; carrinho preservado. Nova tentativa exige nova cotação e chave.
- `pending`: criado sem transação. O mock conta leituras do pedido por ID ou pela chave de tentativa; a segunda leitura o promove a `confirmed`. Isso torna o cenário determinístico e recuperável por refresh. O recibo consulta periodicamente enquanto o estado retornado for pendente. A evolução ocorre no estado da API simulada, sem setter ou timer que fabrique confirmação na interface.

A simulação de sessão expirada encerra a sessão na primeira chamada da tentativa. Após novo login do mesmo usuário, a cotação e a chave são recuperadas, e o reenvio pode concluir o pedido. O recibo remove a tentativa local ao receber a confirmação, inclusive após pendência. Uma falha transitória na consulta de recuperação bloqueia novo envio e oferece nova tentativa para não perder a chave.

O modelo de pedido tem `id`, `updatedAt` e status persistente, permitindo que uma etapa futura invalide a consulta ao receber `order.updated`. O evento Socket.IO e o transporte correspondente não foram implementados nesta etapa.

## Cenários e reprodução

O seletor no checkout permite confirmado, recusado, pendente, timeout antes/depois da criação, cotação expirada, preço alterado, NFT esgotado, sessão expirada e erro HTTP 500. O conflito de idempotência pode ser reproduzido enviando a mesma chave com `network` ou carteira diferente; os testes de endpoint exercitam esse contrato. A carteira oferece simulações de recusa de conexão e desconexão. `POST /api/__mock/reset-auth` restaura as fixtures e limpa as tentativas persistidas na API; testes de navegador usam armazenamento isolado e reset explícito.

Para reproduzir os testes: iniciar Vite com `VITE_ENABLE_MOCKS=true npm run dev -- --host 127.0.0.1`; executar `npm run test:checkout` e `npm run test:checkout:browser`. O segundo comando usa Playwright quando disponível no ambiente. `PLAYWRIGHT_MODULE`, `CHROME_PATH` e `CHECKOUT_TEST_URL` podem apontar para instalações e URL locais.

## Limitações conhecidas

O Figma não está disponível neste projeto; não foi possível comparar a interface com seus frames, assets ou validar todos os campos do layout. O estado é simulado por navegador e o cenário pendente avança por leituras da API, sem provedor externo. A suite de navegador desta etapa cobre compra, recusa, pending, recuperação após timeout e sessão expirada, pendência após refresh, edição de carteira e larguras 390/768/1440; ainda não substitui a cobertura Playwright completa do enunciado. Socket.IO, eventos `order.updated`, perfil editável, auditoria Lighthouse e deploy pertencem a etapas posteriores ou permanecem pendentes no [checklist](implementation-checklist.md).
