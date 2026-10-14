# Auditoria da documentação e do estado atual

> Registro histórico anterior ao recebimento de `docs/desafio-frontend.md`. O documento oficial foi disponibilizado depois desta auditoria; o checklist atualizado está em `docs/implementation-checklist.md`. As observações de ausência abaixo descrevem somente aquele momento.

Data: 14/10/2026. Código inspecionado: commit `b3a25c4` da branch `main`.

## Documento original ausente

O enunciado original não foi encontrado nos arquivos disponíveis do projeto nem no histórico Git local das referências `main` e `origin/main`. Foram examinados nomes de arquivos, inclusive arquivos ocultos e ignorados fora das dependências e saídas geradas, conteúdo textual e nomes de arquivos de todos os commits disponíveis. Não houve consulta a repositórios remotos, contas externas ou documentos fora deste projeto.

O [README](../README.md) contém o texto padrão do Vite. O [relatório da Etapa 5](etapa-5-review.md) é uma revisão baseada na solicitação daquela etapa, não o enunciado do desafio. Nenhum desses arquivos substitui o original.

**É necessário fornecer o documento original completo**, como arquivo ou conteúdo integral. Até recebê-lo, não foram criados `docs/desafio-frontend.md` nem `docs/implementation-checklist.md`: o primeiro não teria conteúdo original para preservar e o segundo não teria requisitos documentais para extrair.

Não é possível determinar requisitos eliminatórios, obrigatoriedade de bibliotecas, critérios de aceite, notas mínimas de Lighthouse, regras de entrega ou percentual de conclusão. Também não é possível afirmar que o projeto está conforme ou que a Etapa 6 está pronta para começar.

## Progresso observado diretamente no código

As categorias abaixo seguem a organização solicitada para a futura documentação. São um inventário de artefatos e evidências; não constituem requisitos reconstruídos. A presença de código não comprova que uma funcionalidade inteira está concluída. O relatório anterior não foi usado como comprovação de execução nesta auditoria.

| Área | Evidência atual | Limite da verificação nesta auditoria |
| --- | --- | --- |
| Arquitetura e stack obrigatória | [package.json](../package.json), [vite.config.ts](../vite.config.ts) e [main.tsx](../src/main.tsx): React, TypeScript, Vite, TanStack Router/Query, Axios, MSW e Tailwind. Separação entre rotas, componentes, API, hooks, tipos e mocks. | Stack e estrutura confirmadas por inspeção. Sua obrigatoriedade depende do original. |
| Catálogo e detalhes de NFTs | [catálogo](../src/routes/index.tsx), [detalhes](../src/routes/nft.$nftId.tsx), [API simulada](../src/mocks/apiState.ts): busca por nome, filtros, ordenação, paginação e edições. | Código presente; fluxos de catálogo e detalhes não executados nesta auditoria. |
| Autenticação e sessão | [hooks](../src/api/hooks/useAuth.ts), [proteção de rotas](../src/auth/routerAuth.ts) e [estado simulado](../src/mocks/authState.ts): login, cadastro, logout, sessão e rotas protegidas. | Teste do estado do carrinho exercitou login/logout e separação de usuários. Não valida formulários, expiração ou navegação no navegador. |
| Carrinho e cotações | [hooks](../src/api/hooks/useCart.ts), [estado](../src/mocks/cartState.ts) e [rota](../src/routes/cart.tsx): itens, quantidades, estoque, cupom, totais, cotação e rollback no código. | Cinco testes do estado simulado passaram agora. Interface e rollback do hook não foram executados nesta auditoria. |
| Checkout e pedidos | [checkout](../src/routes/checkout.tsx), [detalhes do pedido](../src/routes/orders.$orderId.tsx) e [estado de pedidos](../src/mocks/orderState.ts): seleção de carteira/rede, cotação, confirmação, cenários de falha e registros de idempotência. | Código presente; compra completa, recuperação de timeout e idempotência não foram executadas. Inconsistência de cache reproduzida em teste isolado, descrita abaixo. |
| Perfil e carteiras | [perfil](../src/routes/_protected.profile.tsx), [carteiras](../src/routes/_protected.wallets.tsx) e [estado de carteiras](../src/mocks/walletState.ts): consulta do perfil, cadastro e atualização de carteiras simuladas. | Inspeção estática; fluxos não executados. O perfil consultado é de exibição; não foi encontrada edição de perfil nessa rota. Isso não caracteriza descumprimento sem o original. |
| Socket.IO e tempo real | `socket.io-client` declarado em `package.json`. Não foram encontrados imports ou conexão Socket.IO em `src`. | Dependência presente; implementação de comunicação em tempo real não evidenciada. Obrigatoriedade e escopo desconhecidos. |
| Testes Playwright | [script de navegador](../tests/cart-browser.mjs) e comando `test:cart:browser`; [testes de estado](../tests/cart-state.test.mjs). | Script de navegador existe, mas não foi executado agora. Playwright não está declarado nas dependências do projeto; o script aceita instalação externa via `PLAYWRIGHT_MODULE`. Não foram encontrados configuração Playwright Test ou testes de navegador específicos de checkout/pedidos. |
| Acessibilidade e responsividade | Componentes usam labels, atributos ARIA, status/alertas e classes responsivas; exemplos no [carrinho](../src/routes/cart.tsx). | Evidências por inspeção; sem avaliação de teclado, leitor de tela, contraste ou viewports nesta auditoria. Não há certificação de acessibilidade do projeto. |
| Lighthouse e performance | Projeto possui comando de build Vite. | Não foram encontrados configuração ou relatórios Lighthouse. Não foram medidos scores ou performance nesta auditoria; metas dependem do original. |
| Deploy na Vercel | Não foram encontrados configuração Vercel ou registro de URL de entrega nos arquivos examinados. | Deploy não comprovado localmente. Ausência de `vercel.json` não demonstra ausência de deploy: Vite pode ser publicado sem esse arquivo. Conta e ambiente Vercel não foram consultados. |

## Achados antes da próxima etapa

As prioridades abaixo são recomendações de auditoria, não requisitos eliminatórios do desafio.

1. **Bloqueio documental:** falta a fonte original para classificar requisitos e determinar o escopo da Etapa 6. As categorias solicitadas não fornecem, sozinhas, critérios de aceite.
2. **Prioridade alta — inconsistência de cache após pedido:** `useCreateOrder`, em [useOrders.ts](../src/api/hooks/useOrders.ts), invalida `queryKeys.cart.current()` sem informar usuário. A definição em [queryKeys.ts](../src/api/queryKeys.ts) gera `['cart', 'current', 'guest']`; já o carrinho autenticado usa `['cart', 'current', userId]`. Um teste isolado com as chaves reais e `QueryClient` confirmou que invalidar a primeira chave não invalida o cache de `user-ada` (`isInvalidated: false`). O código de sucesso do pedido, portanto, não revalida por essa chamada o carrinho autenticado. O impacto na interface após uma compra ainda precisa de teste ponta a ponta. Nenhuma correção foi realizada nesta tarefa.
3. **Lacuna de verificação:** checkout, pedidos e carteiras possuem código, mas os testes existentes inspecionados concentram-se no carrinho. Cenários declarados em tipos e seletores não comprovam o funcionamento desses cenários.
4. **Lacuna de reprodução dos testes de navegador:** uma instalação limpa com as dependências declaradas não fornece Playwright. Registrar e decidir a configuração reproduzível após confrontar o original; não houve instalação de dependências nesta tarefa.
5. **Lacuna de evidência:** tempo real, medições Lighthouse e publicação Vercel não têm comprovação nos arquivos examinados. Não classificar esses pontos como falhas eliminatórias sem a fonte.
6. **Configuração a documentar:** [start.ts](../src/mocks/start.ts) só inicia MSW quando `VITE_ENABLE_MOCKS=true`. É necessário conferir a configuração efetivamente usada nas futuras validações e na entrega; não houve consulta ao ambiente publicado.

## Checklist quando o original estiver disponível

Preservar integralmente o conteúdo em `docs/desafio-frontend.md`, mantendo tabelas, exemplos, exceções e critérios eliminatórios. Em seguida, extrair apenas requisitos presentes nessa fonte para `docs/implementation-checklist.md`, organizados pelas onze áreas da tabela acima. Registrar a referência ao trecho original, evidência no código, método de verificação e resultado para cada item. Não inventar itens para preencher categorias sem requisitos na fonte.

Usar os quatro estados solicitados, somente depois de identificar o requisito original:

- **Concluído e verificado:** implementação atende ao requisito identificado e possui evidência de verificação apropriada, com alcance explícito.
- **Implementado, mas não verificado:** há código correspondente, mas falta a verificação necessária.
- **Pendente:** requisito documental identificado sem implementação correspondente.
- **Parcialmente implementado:** apenas parte do requisito documental está implementada; indicar a parte faltante.

Não aplicar esses rótulos a requisitos desconhecidos, nem atribuir um único estado de conclusão a uma área inteira por existir uma rota. A identificação dos eliminatórios deve reproduzir a indicação do documento, distinguindo-a de riscos técnicos avaliados pela equipe.

## Ordem recomendada para continuar

1. Receber o original e centralizá-lo integralmente, sem substituir seu texto pelos relatórios de revisão.
2. Extrair o checklist rastreável, identificar os eliminatórios e confirmar o escopo documental da Etapa 6.
3. Comparar cada item com o código atual e a evidência de testes. Priorizar primeiro os eliminatórios explicitamente identificados e os defeitos comprovados que afetem seus fluxos.
4. Antes de considerar o checkout validado, investigar a invalidação do carrinho descrita acima e testar compra, atualização do carrinho e detalhes de pedido em conjunto, conforme o escopo confirmado.
5. Ordenar as implementações e verificações restantes pelas dependências reais dos requisitos. Definir tempo real, cobertura de navegador, acessibilidade, medições e entrega a partir da fonte, sem presumir sua obrigatoriedade ou critérios.

## Verificações realmente realizadas

- Inventário de arquivos, busca textual e inspeção do histórico Git local disponível; inspeção dos arquivos de código citados.
- `npm run test:cart`: **5 testes aprovados**, cobrindo estoque/edições/validação de quantidade, cálculos decimais/cupom, invalidação de cotação, mesclagem e separação do carrinho entre sessões de usuários.
- Teste isolado de React Query com as chaves reais: confirmou a incompatibilidade entre a invalidação do hook de pedidos e o carrinho autenticado.
- A tarefa altera exclusivamente esta documentação. Não foram executados TypeScript, lint, build, Playwright, Lighthouse ou deploy nesta auditoria; resultados de execuções anteriores não foram reapresentados como verificações atuais.
