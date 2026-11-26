# ADR 003 — Refatoração dos componentes por DIP guiada por métricas

| Campo | Valor |
|---|---|
| **Status** | Aceito |
| **Sprint** | Sprint 2 (ADR 1 da sprint: decisões do processo de mapeamento, medição e refatoração) |
| **Data** | Outubro de 2026 |
| **Projeto** | Agile Dead Trees — Editora Digital (Grupo Nexus) |
| **Relação com outras ADRs** | Cumpre a ADR 001 em nível de componente; base do estilo da ADR 004 |

## Contexto

A ADR 001 exige que o negócio acesse sistemas legados só por adaptadores, e a ADR 002 coloca a impressão em eventos assíncronos. A medição do protótipo mostrou que o código não cumpre essas decisões: o Backend.RegrasDeNegocio está na Zona de Dor (D = 0,67), existe um ciclo Backend ↔ Integração e a Integração tem dependentes no negócio (D = 0,40). Qualquer mudança no mainframe ou no broker atinge a regra de publicação.

## Decisão

1. Inverter todas as dependências que saem do negócio com interfaces: portas de saída `ImpressoraGateway` e `PublicadorEventos`; portas de entrada `PublicarLivroUseCase` e `ProcessarImpressaoUseCase`.
2. Transformar os modelos `Livro` e `SolicitacaoImpressao` em interfaces de dados.
3. Separar o Backend em dois pacotes: `Backend.RegrasDeNegocio`, só com contratos (A = 1), e `Backend.Aplicacao`, com as implementações.
4. Fazer a montagem por um contêiner de injeção de dependência, sem imports de classes concretas.
5. Adotar D = 0 como meta para os pacotes do fluxo de publicação, medida por classe.

## Alternativas consideradas

- **Manter o código e apenas documentar o risco** — rejeitada: mantém o ciclo e a Zona de Dor e descumpre a ADR 001.
- **Aplicar DIP só nas portas de saída** — rejeitada: resolve o ciclo, mas deixa o Backend com D = 0,67.
- **Aplicar DIP nas portas de entrada sem separar a implementação** — rejeitada: para em D = 0,25.
- **Usar Service Locator estático** — rejeitada: esconde a dependência em vez de invertê-la e dificulta testes.
- **Separar contratos e implementação com injeção de dependência** — selecionada: D = 0 em todos os pacotes.

## Consequências

**Positivas:** grafo sem ciclos; regra de negócio testável com dublês das interfaces, sem mainframe nem broker; trocar o sistema de impressão ou a tecnologia de mensageria exige só um novo adaptador; cumprimento verificável da ADR 001.

**Negativas:** mais arquivos (seis interfaces e um pacote novo); uma camada de indireção a mais para quem lê o código; necessidade de disciplina para não colocar lógica nas interfaces de dados nem vazar detalhes do mainframe nas assinaturas.

## Governança e Fitness Function

A cada pull request, o pipeline executa duas verificações:

- **Regras de import** (ex.: dependency-cruiser): `Backend.RegrasDeNegocio` não importa nenhum outro pacote; `Backend.Aplicacao` não importa `ApiRest` nem `Integracao`; ciclos são proibidos.
- **Script de métricas:** recalcula Ca, Ce, I, A e D por pacote e falha o build se algum pacote mapeado sair de D = 0. Um pacote novo entra no cálculo assim que for criado.
