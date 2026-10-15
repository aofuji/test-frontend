# Arquitetura do projeto

O aplicativo usa React e TypeScript com Vite. TanStack Router mantém rotas públicas e protegidas; TanStack Query guarda dados remotos; Axios chama `/api`; MSW intercepta essas chamadas quando `VITE_ENABLE_MOCKS=true`. Os contratos ficam em `src/api/types`, o estado simulado em `src/mocks` e as telas em `src/routes`. Esta configuração permite executar a demonstração sem backend externo.

O enunciado fornecido pela Jungle Gaming é a fonte dos requisitos. Os contratos REST e as políticas de carrinho, cotação, carteiras e pedidos estão consolidados neste documento. A [revisão de entrega](delivery-review.md) registra as verificações executadas e as lacunas restantes.

Os mocks persistem sessão, perfil, favoritos, NFTs alterados, carrinho, carteiras e pedidos no `localStorage`, separados por usuário quando privados. A camada MSW é a autoridade para preços, totais, cotações, estados de pagamento e idempotência; os componentes exibem a resposta e invalidam as consultas relevantes. A conexão REST é simulada; não há blockchain nem gateway real. A referência visual é o Figma fornecido no desafio; as imagens usadas pela aplicação ficam em `public/`. Os exports estáticos usados durante a implementação não comprovam interações do protótipo original.

## Acessibilidade

O documento usa `lang="pt-BR"` e título descritivo. O link “Pular para o conteúdo” aparece ao receber foco e direciona ao `main`. Títulos das rotas de autenticação e da região do catálogo mantêm a hierarquia sem alterar sua apresentação. Os filtros usam IDs únicos por instância, inclusive quando sidebar e painel mobile coexistem.

Os modais de autenticação reutilizam `Dialog` do Radix já instalado: foco inicial, contenção de Tab/Shift+Tab, isolamento do fundo e fechamento com Esc. Ao fechar, o foco retorna ao acionador visível ou ao acesso de perfil após autenticação. As abas de autenticação e detalhes do NFT usam setas/Home/End, um único tab stop e vínculo com o painel correspondente. Painéis mobile de filtros/favoritos mantêm a mesma gestão de foco do Radix.

Erros de autenticação têm `role="alert"`, IDs e `aria-describedby`; labels permanecem estáveis e o primeiro campo inválido recebe foco. Formulários anunciam carregamento com `aria-busy` e o cadastro anuncia sucesso como status. Nomes acessíveis de ações incluem o texto visível, permitindo também acionamento por voz.

`npm run test -- accessibility-browser` reutiliza Playwright e o axe-core incluído no Lighthouse, sem dependências novas. Exercita teclado, foco, erros, nomes, sliders, seleção de carteira, painéis mobile e 31 auditorias automatizadas em 1440px/375px, incluindo contraste. As cores principais verificadas têm razões de 17,10:1 (texto principal), 5,92:1 (secundário), 6,04:1 (laranja) e 6,71:1 (texto do botão). A paleta e o layout foram preservados; a área do modal desktop também foi comparada por pixels sem diferença.

Essa verificação não substitui teste com leitor de tela real nem certifica conformidade WCAG completa. O axe pode exigir inspeção manual para casos inconclusivos, como conteúdo sobre imagens/gradientes; não se pressupõe que toda combinação de estados e dados foi auditada.

## Autenticação social pendente

Os botões **Continuar com Google** e **Continuar com Facebook**, exibidos nos modais de login e cadastro, reproduzem apenas o visual do Figma. Permanecem desabilitados: não iniciam autenticação, não criam sessão e não redirecionam para os provedores.

A autenticação social ainda não foi implementada. Não há integração OAuth nem suporte correspondente na API/MSW. O login por e-mail e senha e o cadastro existentes continuam sendo os fluxos funcionais. Para habilitar os botões, será necessário implementar o suporte aos provedores e sua integração com a sessão da aplicação.

## Busca de NFTs pelo header

A entrada de busca fica na lupa do header, em `src/routes/__root.tsx`. O campo acima dos filtros foi removido do catálogo para seguir o Figma. Ao abrir a busca, o header preenche o campo com o parâmetro `q` atual e dá foco ao input. O texto digitado fica em um estado local temporário; digitar não altera a consulta nem dispara uma pesquisa a cada tecla.

Ao pressionar Enter ou acionar o botão de busca, o header navega para `/`, atualiza `q` com o texto sem espaços nas extremidades e reinicia `page` em `1`. Uma busca vazia remove `q`. A navegação combina os valores padrão do catálogo com os parâmetros atuais, preservando categoria, rede, disponibilidade, ordenação e cenário. Depois, fecha o campo e rola até `#catalogo`. Esc dentro da busca ou o botão X fecham o campo sem aplicar o rascunho e devolvem o foco à lupa; o formulário se adapta à largura disponível no mobile.

A URL continua sendo a fonte da busca aplicada. Em `src/routes/index.tsx`, a validação da rota lê `q`, e o catálogo o repassa como `search` para o hook existente `useNfts`. Esse hook usa os parâmetros na chave de cache do TanStack Query e chama `getNfts`, que consulta `GET /api/nfts`. Assim, o header apenas controla a entrada e a navegação: a consulta, os filtros e os estados de carregamento, erro e vazio continuam no fluxo existente, sem outro mecanismo de pesquisa ou alterações na API e no MSW.

A verificação no navegador cobriu foco automático, envio por Enter, preservação dos filtros e da ordenação na URL, reinício da paginação, navegação para o catálogo, fechamento por Esc/X, retorno de foco, uso no mobile e pesquisa iniciada a partir do carrinho. TypeScript e lint passaram após a alteração.

## Perfil e favoritos

`GET/PATCH /api/profile` e `POST /api/profile/password` exigem sessão. A edição inclui nome, e-mail, bio, categorias e avatar PNG/JPEG/WebP de até 256 KB convertido em data URL. MSW valida os dados, impede e-mail duplicado e persiste a alteração; a mutation TanStack Query atualiza perfil e sessão. A troca de senha exige a senha atual e grava somente o hash usado pelo mock, nunca o texto original. Esse hash não é criptograficamente seguro e o `localStorage` não oferece proteção de servidor: são apenas mecanismos da simulação, inadequados para contas reais.

`GET /api/favorites`, `PUT /api/favorites/:nftId` e `DELETE /api/favorites/:nftId` exigem sessão e usam armazenamento separado por ID de usuário. O botão no catálogo/detalhe mantém a intenção em `sessionStorage` enquanto encaminha o visitante ao login e a consome ao voltar. O cache TanStack Query usa chave por usuário; a mutation atualiza otimisticamente, restaura o snapshot se a API falhar e invalida a consulta ao terminar. Logout remove consultas privadas. `POST /api/__mock/favorites/fail-next` injeta um erro HTTP 500 ou falha de conexão apenas para teste, e o reset de mocks também limpa favoritos e intenção pendente.

No detalhe, a edição selecionada determina a disponibilidade e o limite inteiro da quantidade. O carrinho e a API continuam aplicando a validação autoritativa. Skeletons dependentes de dados usam shimmer em CSS, interrompido por `prefers-reduced-motion`.

## Hero e possibilidade de carrossel

O frame de Início do Figma mostra um banner e três pontos laranja iguais. A inspeção dos exports locais e dos assets disponíveis não identificou outros dois slides definidos, com imagens, textos e destinos próprios. A presença dos pontos sugere um carrossel, mas não confirma seu conteúdo nem seu comportamento. Os três NFTs retornados pela consulta de destaques também não definem, por si só, três banners do hero.

Por isso, o hero em `src/routes/index.tsx` mantém um único banner, usando o primeiro NFT da consulta de destaques existente. Os pontos são decorativos, marcados com `aria-hidden="true"`, sem botões, estado ativo ou troca automática. O botão EXPLORAR continua levando a `#catalogo`, e a imagem mantém o link para os detalhes do NFT. Loading, erro e ausência de destaque continuam tratados. A imagem foi ajustada para 450 × 450 px no desktop, com adaptação à largura no mobile.

Um carrossel funcional é tecnicamente viável sem nova biblioteca ou endpoint. Para implementá-lo, primeiro é necessário definir os slides ou aprovar explicitamente o uso dos NFTs de destaque como conteúdo do carrossel. Com esse conteúdo definido, a implementação pode reutilizar `featuredQuery`, manter apenas o índice ativo no estado local e gerar indicadores clicáveis a partir dos slides realmente disponíveis. Deve tratar respostas com menos itens, manter o índice válido quando os dados mudarem e preservar estados de carregamento, erro e vazio. Os controles devem ter nomes acessíveis, indicação do slide ativo e operação por teclado e toque. Essa evolução ainda não foi implementada; não há conteúdo adicional inventado para preencher os três pontos.

A verificação do hero atual no navegador cobriu a imagem de 450 × 450 px, os três pontos decorativos, o link EXPLORAR e ausência de overflow nas larguras de 1024, 390 e 320 px. TypeScript e lint passaram.

## Destaques e galeria

A Home consulta a mesma rota REST do catálogo com `featuredOnly=true`, `pageSize=3` e cenário MSW da URL. A seleção dos IDs está em `src/mocks/fixtures/nfts.ts`; o filtro ocorre em `src/mocks/apiState.ts`, após ler o estado atual dos NFTs. Por isso os cartões de destaque exibem preço e disponibilidade atualizados também após `nft.updated`. Loading, erro e vazio são tratados separadamente do catálogo. Não há novo endpoint nem valores de negócio definidos no componente.

O contrato de NFT inclui `images: { src, alt, label }[]`. As fixtures utilizam imagens PNG locais de `public/images/nfts/`. A galeria deduplica imagens pela URL, informa falhas de carregamento e permite navegar pelas imagens distintas disponíveis, sem duplicar assets para preencher o layout. A rota `/api/__mock/profile/read-failure` aceita `{ enabled: true | false }` para reproduzir falha HTTP 500 na consulta do perfil e testar recuperação por nova tentativa; o reset limpa esse cenário.

## Carrinho e cache por sessão

O carrinho usa `GET /api/cart`, `POST /api/cart/items` (`nftId`, `editionId`, `quantity`), `PATCH /api/cart/items/:itemId` (`quantity`), `DELETE /api/cart/items/:itemId` e `PATCH /api/cart/items` (`couponCode`, ou `null` para remover). As respostas de sucesso contêm `{ cart: Cart }`; falhas incluem validação, item/edição inexistente, estoque insuficiente, NFT indisponível, cupom inválido/expirado e erros transitórios. Os tipos estão em `src/api/types/cart.ts`.

A API valida quantidade inteira positiva e estoque por NFT/edição. Edições sem estoque explícito conservam limite padrão 1; as fixtures incluem Aurora edição A com estoque 5 e Pixel Reef edição A com estoque 3. Os controles respeitam os limites e possuem nomes acessíveis por NFT/edição. `SAVE10` e `EXPIRED` permitem reproduzir aplicação/remoção de desconto e erro de cupom; formulário vazio não remove um cupom acidentalmente.

Subtotal, desconto, taxa e total vêm da API simulada, calculados com `decimal.js` e transportados como strings decimais. A atualização otimista altera a quantidade; os totais anteriores da API continuam identificados como em atualização até a resposta autoritativa. O hook cancela consultas em voo, guarda o snapshot, faz rollback após HTTP ou falha de conexão, aplica a resposta de sucesso e aguarda a invalidação em `onSettled`. As mutations compartilham `scope: { id: 'cart-session' }`; controles ficam bloqueados durante atualizações e tentativas posteriores limpam erros anteriores.

O cache do carrinho usa `['cart', 'current', userId]` ou `guest`. Login/cadastro/logout bem-sucedidos cancelam consultas, removem cache de carrinho e dados privados e invalidam a consulta da identidade atual. Falha de logout preserva sessão e permite nova tentativa. A mesclagem do visitante soma quantidades sem duplicar NFT/edição, limita ao estoque, elimina indisponíveis e limpa o carrinho visitante. Refresh mantém os itens persistidos e a troca de usuário não compartilha carrinhos privados.

Adição, remoção, quantidade, cupom e mesclagem bem-sucedidos invalidam as cotações do respectivo dono; mutações recusadas preservam-nas. Carrinho vazio não gera cotação. A interface mantém skeleton, estado vazio, erros anunciados e nova tentativa. Os testes cobrem rollback, persistência, isolamento e larguras 320/375/768/1440; isso não equivale a certificação WCAG ou teste com leitor de tela real.

## Carteiras, cotações e pedidos: contratos REST

Toda resposta de negócio vem dos handlers MSW em `src/mocks/handlers.ts`, com contratos TypeScript em `src/api/types` e transporte Axios em `src/api`. Não há blockchain, extensão de carteira, gateway ou backend separado.

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

## Campos de carteiras e limites de persistência

O formulário segue duas colunas no desktop, com cinco linhas em cada coluna, adaptadas ao mobile. Apenas os campos suportados pelo contrato de carteiras são enviados em POST/PATCH; os demais reproduzem o Figma como estado local, sem persistência inventada.

| Coluna | Campo | Estado, validação e persistência |
| --- | --- | --- |
| Esquerda | Nome de exibição | Estado local, inicializado com o nome da sessão. Não atualiza o perfil nem bloqueia o cadastro da carteira. |
| Esquerda | Rede | `form.network`; enum Ethereum, Polygon ou Base validado e persistido pela API. |
| Esquerda | Endereço da carteira | `form.address`; EVM (`0x` e 40 dígitos hexadecimais), erro associado ao campo, persistido pela API. |
| Esquerda | Tipo de carteira | `form.kind`; principal/secundária, enum e regra de principal única da API. Persistido sem obrigatoriedade extra. |
| Esquerda | E-mail | Estado local, inicializado com o e-mail da sessão. Não altera conta/perfil nem executa suas validações implicitamente. |
| Direita | Apelido da carteira | `form.label`; nome não vazio conforme API, sem limite de tamanho inventado. Persistido pela API. |
| Direita | Nome do perfil | Estado local livre; sem regra ou persistência no contrato de carteiras. |
| Direita | ENS ou carteira secundária (opcional) | Estado local opcional, sem resolução ENS, validação EVM ou vínculo automático com outra carteira. |
| Direita | Código de indicação | Estado local; não verifica códigos nem concede desconto/recompensa. |
| Direita | Nome ENS | Estado local e seletor `.eth`; sem resolução, registro, validação ENS ou persistência. |

Os campos complementares usam React state, sem localStorage. Refresh restaura nome/e-mail da sessão e limpa os demais. O aviso ao lado de Salvar informa que apenas apelido, rede, endereço e tipo são salvos. Campos complementares não ganharam `required`, `pattern` ou validação nativa que bloqueie o envio.

Na seção **Carteira secundária**, o checkbox **Igual à carteira principal** é local: não chama a API nem sincroniza ou duplica carteiras. **Adicionar** prepara o formulário existente com tipo secundário; se marcado, copia endereço/rede da principal para o rascunho e mantém o apelido vazio. O usuário revisa e salva pelo POST existente. Sem principal, o checkbox fica desabilitado. O **Adicionar** do topo prepara novo rascunho; listagem, edição, conexão e definição da principal mantêm seus handlers.

`npm run test:wallets:browser` verifica os dez campos, ordem/alinhamento, estado local, payload, validação EVM, persistência, refresh, edição, controles da secundária e reflow. Executado diretamente, requer servidor e Chromium/Chrome conforme o README; aceita `PLAYWRIGHT_MODULE`, `CHROME_PATH` e `WALLETS_TEST_URL`. Também integra `npm run test`, que gerencia o servidor automaticamente.

## Idempotência, cotação e persistência

A cotação dura cinco minutos e pertence ao carrinho do usuário atual. `POST /api/orders` primeiro busca uma tentativa já registrada por usuário e chave. Payload idêntico (`quoteId`, `walletId`, `network`) devolve o mesmo pedido; payload diferente devolve `409 IDEMPOTENCY_CONFLICT`. Os cenários de teste não fazem parte da identidade da compra. Antes de criar um pedido, o mock confere expiração, preço, disponibilidade, itens, cupom, totais e carteira. Uma divergência rejeita a compra e exige nova cotação e revisão.

A interface grava `userId`, `quoteId`, chave, carteira, rede e cenário em `nft-marketplace.checkout-attempt.v1`. Após refresh ou login, consulta primeiro o pedido pela chave. Se ainda não foi criado, recupera a cotação e reutiliza a chave. O estado da API fica em `nft-marketplace.order-state.v1`; carteiras em `nft-marketplace.wallet-state.v1`; carrinho e cotações em `nft-marketplace.cart-state.v1`. Tudo é local ao navegador, sem persistência entre dispositivos. A API faz o isolamento por usuário. Logout limpa o cache privado do TanStack Query; a tentativa só é usada quando o `userId` coincide.

No timeout antes da criação não há pedido; a primeira chamada falha e a mesma tentativa pode ser reenviada após refresh. No timeout após a criação, a primeira chamada falha na rede, mas o pedido já existe no estado MSW; consultar pela chave ou reenviar o mesmo payload retorna o mesmo ID. Pedidos confirmados debitam do carrinho as quantidades do snapshot uma única vez por ID, com registro persistente de aplicação. Itens adicionais do carrinho não são removidos pelo helper de débito. Pedidos recusados e erros mantêm os itens. Após uma resposta de confirmação ou a evolução posterior de um pedido pendente, o cliente invalida o prefixo de todas as chaves de carrinho, incluindo a do usuário autenticado.

## Estados de pagamento e recuperação

- `confirmed`: terminal, com referência fictícia de transação e recibo; a interface confirma somente após resposta da API.
- `declined`: terminal, sem transação; mantém o carrinho. Nova compra exige nova cotação e chave.
- `pending`: criado sem transação. O estado MSW pode promovê-lo por timer ou na segunda consulta por ID/chave, emitindo `order.updated`. No refresh, a consulta reativa o timer. O recibo não faz polling periódico nem fabrica confirmação na interface.
- `pending-manual`: cenário de teste que permanece pendente até `POST /api/__mock/realtime/order`, permitindo exercitar reconexão e recusa sem promoção automática.

A simulação de sessão expirada encerra a sessão na primeira chamada da tentativa. Após novo login do mesmo usuário, a cotação e a chave são recuperadas, e o reenvio pode concluir o pedido. O recibo remove a tentativa local ao receber a confirmação, inclusive após pendência. Uma falha transitória na consulta de recuperação bloqueia novo envio e oferece nova tentativa para não perder a chave.

## Cenários, testes e limites da simulação

No servidor de desenvolvimento e viewport desktop, o seletor do checkout oferece confirmação, recusa, pendência, timeout antes/depois da criação, cotação expirada, preço alterado, NFT esgotado, sessão expirada e HTTP 500. Os controles técnicos ficam ocultos no mobile e no build de produção; os handlers de cenário continuam disponíveis com MSW ativo. Carteiras têm cenários de recusa de conexão, desconexão, erro HTTP e falha de rede. O conflito de idempotência é reproduzido reenviando uma chave com rede ou carteira diferentes.

`POST /api/__mock/reset-auth` restaura o estado inicial de autenticação, perfis, favoritos, NFTs, carrinhos, cotações, carteiras, pedidos e conexões simuladas, e limpa a tentativa persistida de checkout. As suítes usam armazenamento isolado e reset quando necessário. O estado pertence ao navegador atual; não há persistência compartilhada entre dispositivos nem segurança de backend real.

Os comandos atuais de instalação, cenários e execução estão no [README](../README.md). `npm run test` inicia e encerra Vite com mocks automaticamente e executa as suítes existentes. `npm run test:cart` e `npm run test:checkout` executam os testes de API/estado; `npm run test:cart:browser` e `npm run test:checkout:browser` requerem servidor já iniciado. Playwright está declarado no projeto; é necessário Chromium instalado ou `CHROME_PATH`. `PLAYWRIGHT_MODULE`, `CART_TEST_URL` e `CHECKOUT_TEST_URL` continuam aceitos como overrides opcionais.

As verificações registradas cobrem quantidades/estoque, cupom, totais, mesclagem e isolamento, falhas e rollback, invalidação de cotação, compra completa, recusas e pendências, idempotência/timeout, sessão expirada e edição persistida de carteira. TypeScript, lint, build e 15 suítes passaram na [revisão de entrega](delivery-review.md); a consolidação documental não constitui nova execução desses testes. Cobertura integral do enunciado, baselines visuais, auditorias Lighthouse completas e validação em hospedagem pública continuam com o alcance e as pendências descritos nessa revisão.

## Tempo real

`src/mocks/realtime.ts` registra um `ws.link` do MSW na origem da página. O MSW normaliza o caminho de transporte `/socket.io/` para `/` ao casar o handler. O mock envia handshake Engine.IO v4 (`0`), confirma o namespace Socket.IO (`40`) e envia eventos (`42`). O cliente usa `socket.io-client` com transporte WebSocket apenas, carregado depois de `worker.start()` porque Socket.IO captura o construtor global de WebSocket ao ser importado. Isso funciona no Vite e no preview estático de produção com `VITE_ENABLE_MOCKS=true`, sem processo de servidor separado. `@mswjs/socket.io-binding@0.2.0` não foi usado: declara peer `msw@^2.10.2`, enquanto este projeto usa MSW 3.0.3. A implementação local cobre os quadros necessários, sem suporte geral a rooms, namespaces adicionais, acknowledgements ou fallback HTTP long-polling.

`nft.updated` envia `{ nftId, editionId?, priceEth, available, version }`. `order.updated` envia `{ orderId, userId, status, version }`, com `pending`, `confirmed` ou `declined`. NFTs usam versão inicial 1 e pedidos são criados na versão 1; cada mudança incrementa a versão persistida. O módulo `src/realtime/useRealtime.ts` mantém uma conexão por instância da raiz, descarta versões repetidas ou menores durante a sessão, cancela consultas em voo e invalida as chaves TanStack Query existentes. A consulta REST refaz catálogo, destaques, detalhe, carrinho e pedido; o socket não escreve valores de negócio diretamente no cache. No reconnect, consultas ativas são reconciliadas via REST. Em algumas repetições no preview, o gerenciador do cliente ficou preso após o mock fechar a segunda conexão. O watchdog agora reinicia o socket desconectado a cada 2,5 s; a suíte completa passou cinco vezes consecutivas no preview local depois do ajuste. Logout/troca de usuário desmontam listeners e reconectam no contexto novo; o mock filtra eventos privados pelo usuário conectado e o cliente faz a mesma checagem.

Ao mudar um NFT, o estado REST é persistido antes de emitir o evento e as cotações que incluem esse NFT são apagadas. O checkout descarta a cotação exibida e exige nova revisão. Mudanças de pedido são persistidas antes do evento, com o débito idempotente do carrinho aplicado antes da emissão. Pedidos `pending` são promovidos por um timer do mock; no refresh, uma consulta do pedido reativa o timer. O cenário de teste `pending-manual` mantém o pedido pendente até `POST /api/__mock/realtime/order`, permitindo reproduzir desconexão e recusa. Se o socket perdeu eventos, o reconnect invalida as consultas ativas e recupera o estado por REST. O recibo não faz polling periódico.

O mock e sua persistência pertencem ao navegador atual, não sincronizam abas ou dispositivos e não representam segurança de um servidor real. O endpoint de teste `/api/__mock/realtime/*` só existe com mocks ativos. O cliente não cria conexão quando `VITE_ENABLE_MOCKS` está desligado, pois este projeto não configura um backend Socket.IO de produção. O MSW 3 chama `ServiceWorkerRegistration.update()` sem aguardar a promessa quando reutiliza um registro; o Chromium às vezes registra um aviso não fatal de atualização durante navegações completas rápidas nos testes. As suítes distinguem esse aviso específico de erros da aplicação. O preview local repetido não comprova o comportamento em hospedagem real.
