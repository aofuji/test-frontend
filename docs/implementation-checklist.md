# Checklist de implementação — desafio Frontend

Fonte: [enunciado oficial](desafio-frontend.md), disponibilizado no projeto. Revisão em 14/10/2026. A classificação é por requisito identificável na fonte; há testes de carrinho, checkout, perfil, favoritos e tempo real em `tests/`. “Verificado” se restringe ao comportamento efetivamente exercitado por esses testes; existência de código isoladamente não comprova conclusão.

Legenda: **CV** = concluído e verificado; **INV** = implementado, mas não verificado; **PI** = parcialmente implementado; **P** = pendente. São eliminatórios os seis pontos expressamente listados na seção 11 do enunciado. Cada grupo abaixo cita a seção correspondente.

## Arquitetura e stack obrigatória — seções 2, 4, 11 e 12

| Requisito original | Estado | Evidência ou lacuna |
| --- | --- | --- |
| React, TypeScript, TanStack Router, TanStack Query, Axios, REST, Tailwind CSS, shadcn/ui e MSW participam efetivamente | CV | Fluxos de catálogo, conta, favoritos, carrinho, checkout e tempo real exercitados no navegador e API; TypeScript, lint e build passaram. **Eliminatório** quando a stack obrigatória não é usada efetivamente. |
| Socket.IO participa efetivamente | CV | `socket.io-client` recebe quadros Engine.IO/Socket.IO via WebSocket interceptado pelo MSW; teste no Chromium e preview de produção. **Eliminatório** por ausência de uso efetivo da stack. |
| Contratos tipados, cache por usuário/parâmetro, descarte de respostas obsoletas, estados de carga/erro e rollback otimista | PI | Presente em API/hooks e carrinho; cobertura integral das rotas ainda não demonstrada. |
| Fluxos principais são funcionais e não apenas visuais | PI | Compra, conta, favoritos, carrinho, destaques, galeria e descoberta têm testes de navegador. Cadastro e alguns cenários completos de checkout ainda carecem de cobertura E2E. **Eliminatório**. |
| Rotas inexistentes, acesso direto, execução de checkout limpo e documentação completa | PI | Há rota 404; acesso direto ao detalhe/perfil e checkout foram exercitados. Cobertura integral das rotas e documentação de entrega ainda faltam. |

## Catálogo e detalhes de NFTs — seções 3, 4 e 5

| Requisito original | Estado | Evidência ou lacuna |
| --- | --- | --- |
| Destaques, catálogo, busca, filtros combináveis, ordenação, paginação e estado da URL | CV | Destaques usam `GET /api/nfts?featuredOnly=true` e fixtures selecionadas; testes de API/navegador cobrem preço e disponibilidade atualizados, loading/erro/vazio, URL combinada, paginação, histórico e refresh. |
| Detalhe com galeria, edição, quantidade, favoritos, acesso direto, ausentes e indisponíveis | CV | Imagens e miniaturas vêm do detalhe REST; seleção por teclado, fallback de imagem, acesso direto a NFT inexistente, quantidade/estoque e favoritos verificados no Chromium. |
| Atualizações de preço/disponibilidade via `nft.updated` e reconciliação REST | CV | Cenários de preço, estoque, duplicata, fora de ordem e evento perdido no navegador; catálogo, detalhe e carrinho consultam a API simulada. |

## Autenticação e sessão — seções 3, 4, 5 e 6

| Requisito original | Estado | Evidência ou lacuna |
| --- | --- | --- |
| Cadastro, login, logout, sessão recuperável e rotas privadas | PI | Login, logout, expiração e retomada de perfil/checkout verificados; cadastro e conflito de cadastro ainda sem teste E2E dedicado. |
| Validação, conflito de cadastro, expiração e retomada do contexto no checkout | PI | Login, cadastro e redirecionamento existem; tentativa de checkout é persistida por usuário e a expiração durante o envio foi exercitada no navegador; outros cenários de sessão ainda precisam de verificação. |
| Limpeza de cache privado/subscriptions após logout e troca de usuário | CV | Hooks de autenticação limpam cache privado; conexão e listeners são encerrados e refeitos ao trocar `userId`. Teste Playwright descarta evento do usuário anterior. **Exposição entre usuários é eliminatória**. |

## Carrinho e cotações — seções 3, 4 e 5

| Requisito original | Estado | Evidência ou lacuna |
| --- | --- | --- |
| Inclusão, quantidades inteiras, remoção, estoque/edição, persistência, mesclagem de visitante e cupom | CV | Cinco testes de estado do carrinho e suíte de navegador existente; esta classificação cobre os cenários testados, não alterações em tempo real. |
| Totais e ETH decimais da API, cotação válida para compra | CV | API simulada usa `decimal.js`; endpoint tests comparam snapshot, revisão e total. |
| Alterações enquanto carrinho aberto e atualização por evento `nft.updated` | CV | Teste Playwright no preview verifica resumo atualizado, estoque e cotação invalidada pela API. |

## Checkout e pedidos — seções 3, 5, 6 e 11

| Requisito original | Estado | Evidência ou lacuna |
| --- | --- | --- |
| Dados do colecionador, carteira/rede, revisão, estados de loading/erro/sucesso | PI | Rota existente, skeleton, feedback; validação de todos os campos do Figma depende de acesso ao layout. |
| Revalidar preço, estoque/edição, cupom, taxas e expiração; exigir nova revisão se mudar | PI | API rejeita cotação vencida/alterada; checkout pede nova cotação. Teste cobre erros, não todos os caminhos de revisão pela UI. |
| `POST /api/orders` e `GET /api/orders/:orderId`, compra confirmada apenas por resposta da API | CV | Endpoints MSW e teste de compra completa até recibo. **Confirmação sem resposta da simulação é eliminatória**. |
| Chave de idempotência: mesmo payload retorna o mesmo pedido, payload diverso HTTP 409 | CV | Estado MSW persistido e teste dos endpoints. |
| Cliques repetidos e timeout antes/depois da criação recuperam a mesma tentativa após refresh | PI | API e navegador cobrem os dois timeouts com refresh. Cliques repetidos em rápida sucessão ainda precisam de teste específico de interface. |
| `pending`, `confirmed`, `declined`; pendente recuperável e estados terminais | CV | Evolução na API simulada; testes dos endpoints e navegador. |
| Recibo imutável com transação, NFTs, edições, quantidades, preços, descontos, taxas e total | CV | Snapshot no pedido e teste que muda o preço do catálogo após compra. |
| Remover só itens/quantidades comprados, preservar extras, não repetir remoção e preservar itens em falha/recusa | PI | API remove quantidades do snapshot uma vez por pedido, preserva recusa e falha; preservação de itens adicionais durante compra concorrente ainda requer teste. |

## Perfil e carteiras — seções 3, 5 e 6

| Requisito original | Estado | Evidência ou lacuna |
| --- | --- | --- |
| Consultar, cadastrar, editar e definir carteira principal/secundária; persistir e isolar por usuário | CV | REST MSW e testes de edição, persistência e isolamento; formulário de edição testado no navegador. |
| Simular conexão, recusa e desconexão | PI | Estado e controles na rota; todos os cenários não foram exercitados no navegador. |
| Editar perfil, avatar e senha com validação e persistência | CV | Axios/Query/MSW, validação local e da API, foto, senha, refresh, conflito de e-mail, falha de leitura com recuperação, expiração e isolamento testados em API e Chromium. |

## Favoritos — seções 3, 4, 5 e 6

| Requisito original | Estado | Evidência ou lacuna |
| --- | --- | --- |
| Consultar, adicionar e remover favoritos autenticados, persistidos e isolados por usuário | CV | REST MSW e testes de API/navegador: intenção após login, refresh, troca de usuário e rollback otimista após HTTP 500. |

## Socket.IO e tempo real — seções 2, 6 e 7

| Requisito original | Estado | Evidência ou lacuna |
| --- | --- | --- |
| `nft.updated` e `order.updated` via cliente Socket.IO e mocks compatíveis | CV | `src/mocks/realtime.ts` intercepta o WebSocket com MSW; `src/realtime/useRealtime.ts` usa `socket.io-client`. Teste Playwright verifica atualização de carrinho, checkout e recibo sem polling. |
| Versões, descarte de duplicatas/antigos, reconexão, reconciliação REST e isolamento de sessão | PI | Teste cobre duplicata/fora de ordem e evento antigo após refresh de NFT, evento perdido, troca de usuário, pedido pendente offline e recusado. Após corrigir o gerenciador preso, cinco execuções consecutivas da suíte passaram no preview local. Reconciliação de todas as rotas ainda não tem cobertura. **Eventos simulados diretamente na UI são eliminatórios**. |

## Testes Playwright — seções 2, 9 e 11

| Requisito original | Estado | Evidência ou lacuna |
| --- | --- | --- |
| E2E executáveis dos fluxos principais | PI | Scripts de carrinho, checkout, tempo real, perfil, favoritos, destaques, galeria, URL, paginação e histórico foram executados com Playwright externo; faltam cobertura ampla e dependência Playwright declarada no projeto. **Ausência de testes E2E executáveis é eliminatória**. |
| Regressão visual, baselines, isolamento/relógio, relatório HTML e traces | P | Não incluídos nos scripts atuais. |

## Acessibilidade e responsividade — seções 3 e 8

| Requisito original | Estado | Evidência ou lacuna |
| --- | --- | --- |
| Layout desktop/tablet/mobile e ausência de overflow em 390, 768 e 1440 px | PI | Checkout, perfil, detalhe e catálogo inspecionados em 390/768/1440 px; detalhe também passou no reflow equivalente a zoom de 200%. Outras rotas ainda carecem de revisão visual. |
| Teclado, foco, labels, mensagens, contraste, zoom, imagens e feedback acessível | PI | Galeria passou em Tab/Enter com anel de foco; mensagens e fallback têm semântica acessível; contraste do texto principal medido em 18,27:1. Auditoria completa de todos os controles, cores e rotas ainda pendente. |
| Skeletons com shimmer, dimensões estáveis e movimento reduzido | PI | Catálogo, detalhe, carrinho e perfil usam skeleton com shimmer; teste Chromium confirma preferência por movimento reduzido. CLS/dimensões ainda requerem medição. |
| Fidelidade ao Figma e substituições de assets documentadas | PI | Figma indisponível; cinco SVGs locais são ilustrações abstratas provisórias para a galeria, documentadas em `ARCHITECTURE.md`. Aderência ao layout não pôde ser avaliada. |

## Lighthouse e performance — seções 2 e 10

| Requisito original | Estado | Evidência ou lacuna |
| --- | --- | --- |
| Início e detalhe, mobile/desktop, três medições e mediana; metas 90/95/95/90 | P | Sem configuração ou relatórios Lighthouse versionados. |
| LCP, CLS, TBT, ambiente e relatórios HTML/JSON | P | Sem medições registradas. |

## Deploy — seção 12

| Requisito original | Estado | Evidência ou lacuna |
| --- | --- | --- |
| URL pública e repositório, versão publicada correspondente, refresh e mocks ativos | P | Deploy não realizado ou comprovado no repositório. **O deploy é obrigatório**; Vercel é recomendada, Netlify e Cloudflare Pages são aceitos. |
| README com setup, credenciais, variáveis, seleção/reset de cenários e reprodução de falhas | PI | Setup, credenciais e controles dos mocks documentados; falta suíte/relatório E2E completo e instruções de auditoria Lighthouse. |
