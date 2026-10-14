# Arquitetura do projeto

O aplicativo usa React e TypeScript com Vite. TanStack Router mantém rotas públicas e protegidas; TanStack Query guarda dados remotos; Axios chama `/api`; MSW intercepta essas chamadas quando `VITE_ENABLE_MOCKS=true`. Os contratos ficam em `src/api/types`, o estado simulado em `src/mocks` e as telas em `src/routes`. Esta configuração permite executar a demonstração sem backend externo.

O [enunciado oficial](desafio-frontend.md) é a fonte dos requisitos. O [checklist](implementation-checklist.md) mostra o progresso e as pendências. Os contratos e as decisões de checkout, carteiras e pedidos estão detalhados em [Etapa 6](etapa-6-checkout.md). A política de carrinho e os testes executados na etapa anterior constam de [Etapa 5](etapa-5-review.md).

Os mocks persistem sessão, carrinho, carteiras e pedidos no `localStorage`, separados por usuário. A camada MSW é a autoridade para preços, totais, cotações, estados de pagamento e idempotência; os componentes exibem a resposta e invalidam as consultas relevantes. A conexão REST é simulada; não há blockchain nem gateway real. Socket.IO e reconciliação com eventos ainda não foram implementados. O Figma não está disponível no projeto, portanto diferenças visuais em relação aos frames oficiais não puderam ser avaliadas.
