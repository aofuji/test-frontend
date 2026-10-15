# Carteiras: conferência dos campos do Figma

Referência: frame Desktop / Carteiras, 1440 × 1080 px, em `design-reference/figma-layout.png`. A grade tem cinco linhas em duas colunas. Contratos consultados: `src/api/types/wallet.ts`, `src/mocks/walletState.ts`, `docs/desafio-frontend.md` (Conta e sessão / Contratos REST).

| Campo | Antes desta alteração | Estado atual | Validação prevista | Persistência |
| --- | --- | --- | --- | --- |
| Nome de exibição | Ausente. O antigo “Nome” representava o apelido da carteira. | `presentation.displayName`, inicialmente preenchido com o nome da sessão. | Nenhuma nova regra no cadastro de carteira. | Edição local; não atualiza o perfil. O perfil tem contrato próprio. |
| Rede | Presente e controlado. | `form.network`, opções Ethereum, Polygon e Base. | Enum conferido pela API. | POST/PATCH da carteira. |
| Endereço da carteira | Presente como “Endereco”, controlado. | `form.address`. | Endereço EVM: `0x` seguido de 40 dígitos hexadecimais. Erro associado ao campo. | POST/PATCH da carteira. |
| Tipo de carteira | Presente como “Tipo”, controlado. | `form.kind`, principal/secundária. | Enum quando informado; regras existentes de principal única mantidas. O contrato não exige obrigatoriedade nova. | POST/PATCH da carteira. |
| E-mail | Ausente nesta tela. | `presentation.email`, inicialmente preenchido com o e-mail da sessão. | Não bloqueia o cadastro da carteira; nenhuma validação de perfil é executada implicitamente. | Edição local; não altera conta/perfil. |
| Apelido da carteira | Presente com o rótulo incorreto “Nome”. | `form.label`, na primeira linha da coluna direita. | Nome não vazio, conforme API; sem limite de tamanho inventado. | POST/PATCH da carteira. |
| Nome do perfil | Ausente. | `presentation.profileName`. | Sem regra definida; campo livre. | Somente estado local. |
| ENS ou carteira secundária (opcional) | Ausente. | `presentation.alternateAddress`. | Opcional; sem resolução ENS, verificação EVM ou vínculo automático com outra carteira. | Somente estado local. |
| Código de indicação | Ausente. | `presentation.referralCode`. | Sem verificação de código, desconto ou recompensa. | Somente estado local. |
| Nome ENS | Ausente. | `presentation.ensName` e `presentation.ensSuffix`; seletor `.eth` conforme frame. | Sem resolução, registro ou validação ENS. | Somente estado local. |

Os campos complementares usam React state, não localStorage. Recarregar restaura os dados de sessão em Nome de exibição/E-mail e limpa os demais. O aviso ao lado de Salvar explica que apenas apelido, rede, endereço e tipo são salvos. Asteriscos foram limitados aos campos exigidos pelo contrato de carteiras; os demais não ganharam `required`, `pattern` ou validação nativa que bloqueie o envio.

## Carteira secundária

| Controle | Antes | Implementação e limites |
| --- | --- | --- |
| Seção e lista | Presentes, com agrupamento por carteira principal/secundárias. | Mantidas. Todas as ações existentes de edição, conexão e definição da principal continuam disponíveis. |
| Igual à carteira principal | Ausente. | Checkbox controlado em estado local. Não chama a API, não sincroniza carteiras nem cria duplicatas automaticamente. |
| Adicionar da secundária | Ausente. | Prepara o formulário existente com tipo secundário. Com o checkbox marcado, copia endereço/rede da principal para o rascunho, mantendo o apelido vazio. O usuário revisa e clica em Salvar para usar o POST existente. Sem principal, o checkbox fica desabilitado. |
| Adicionar do topo | Presente. | Continua preparando um novo rascunho pelo fluxo existente. |

Não foram criados campos no contrato, endpoints, regras de indicação, provedor ENS, persistência de preferências ou atualização implícita de perfil. A exigência genérica de persistência do desafio é atendida pelos campos suportados no contrato; os campos complementares do desenho não são apresentados como persistidos.

## Verificação

`npm run test:wallets:browser` verifica presença/ordem das dez entradas, controle de estado local, ausência de obrigatoriedade extra, payload exato do cadastro, validação EVM, persistência somente dos campos suportados, recuperação após refresh, edição, controles da secundária e reflow. Requer o mesmo Playwright/Chrome externo utilizado pelas demais suítes de navegador; aceita `PLAYWRIGHT_MODULE`, `CHROME_PATH` e `WALLETS_TEST_URL`.
