# ADR 010 — Agente de IA para recomendação e diagramação: RAG, Model Tiering e Guardrails

| Campo | Valor |
|---|---|
| **Status** | Aceito |
| **Sprint** | Sprint 4 — Entrega final (SGE2) |
| **Data** | Novembro de 2026 |
| **Projeto** | Agile Dead Trees — Editora Digital (Grupo Nexus) |
| **Relação com outras ADRs** | Novo módulo do monólito (ADR 004) e Bounded Context "Recomendação e Diagramação" (ADR 008); núcleo isolado por portas (ADR 003); recebe livros pela fila `ia-indexar` (ADR 009); proposta de diagramação usa os enums do contrato da ADR 005; chamada ao modelo protegida como na ADR 006; provedor na AWS, já adotada na ADR 007 |

## Contexto

O desafio final pede um Agente de IA para **recomendação** de livros ao leitor e **diagramação personalizada** dos livros que vão para a gráfica. Modelos de linguagem são componentes probabilísticos: podem inventar um livro que não existe, devolver um formato inválido, demorar ou ficar fora do ar, e custam por token. Os drivers do projeto continuam valendo: a loja não pode ficar mais lenta nos picos de 500 requisições por segundo, a equipe tem três pessoas e o custo precisa ser previsível (ADR 007). Dados de leitores (nome, e-mail, CPF, telefone) não podem ser enviados a um provedor externo.

## Decisão

1. **Módulo `ia` no monólito**, com suas próprias portas: `ModeloLinguagemGateway` (chamada ao modelo) e `IndiceVetorialGateway` (busca por similaridade). O núcleo de Publicação não conhece o módulo de IA; a IA recebe livros por evento (fila `ia-indexar`, ADR 009) e responde por casos de uso próprios.
2. **RAG (Retrieval-Augmented Generation) na recomendação:** cada livro publicado tem sinopse e metadados transformados em embedding e gravados no banco vetorial (**PostgreSQL com pgvector**, índice HNSW). Para recomendar, o agente busca os livros mais próximos do histórico do leitor e o modelo só escolhe e explica **entre esses candidatos**.
3. **Model Tiering:**
   - **Tier 1 — modelo pequeno** (rápido e barato): recomendação e texto de justificativa, que é a chamada de alta frequência (fluxo síncrono F13).
   - **Tier 2 — modelo grande**: diagramação personalizada, que é rara, complexa e assíncrona (fila `ia-diagramar`, F14).
   - Os dois são acessados pelo Amazon Bedrock por trás da porta `ModeloLinguagemGateway`; o nome de cada modelo é configuração, não código.
4. **Recomendação com Strategy e fallback:** `EstrategiaRecomendacao` tem duas implementações, `RecomendacaoPorIa` (RAG + Tier 1) e `RecomendacaoPorRegras` (mais vendidos da mesma categoria). O `RecomendadorLivros` usa a de IA com timeout de 2 s e troca para a de regras quando a IA falha, demora ou tem o circuito aberto. O leitor nunca vê erro.
5. **Diagramação com humano no circuito:** o modelo devolve uma proposta estruturada (formato de papel, acabamento, fonte, corpo, margens e entrelinha). A proposta só vira `SolicitacaoImpressao` depois que o editor aprova; o modelo nunca envia nada à gráfica.
6. **Guardrails:**
   - **Higienização de PII** antes de qualquer chamada: nome, e-mail, CPF e telefone são removidos; o histórico do leitor vai como lista de ISBNs.
   - **Saída estruturada validada por JSON Schema:** recomendação = lista de ISBNs + justificativa; diagramação = campos com os mesmos enums do contrato da ADR 005 (`formatoPapel`: `14x21`, `16x23`, `A5`; `acabamento`: `BROCHURA`, `CAPA_DURA`). Saída inválida é descartada e cai no fallback.
   - **Aterramento no catálogo:** todo ISBN recomendado precisa existir entre os candidatos recuperados; ISBN desconhecido é descartado (anti-alucinação).
   - **Limites de custo:** teto de tokens por chamada e alerta de orçamento mensal, como na ADR 007.

## Alternativas consideradas

- **Só LLM, sem RAG** — rejeitada: o modelo não conhece o catálogo da editora e recomendaria livros que não existem.
- **Um único modelo grande para tudo** — rejeitada: latência e custo altos na chamada mais frequente (recomendação nos picos).
- **SLM rodando localmente na própria aplicação** — rejeitada nesta fase: exigiria GPU e operação que a equipe de três pessoas não tem; reavaliar se o custo por token crescer.
- **Banco vetorial gerenciado dedicado** — rejeitada: custo fixo alto para um catálogo pequeno (ordem de 180 mil livros em 5 anos, BOTE da Sprint 1); pgvector usa SQL, que a equipe conhece, e é portável.
- **Sistema multiagente** — rejeitada: dois casos de uso bem delimitados não justificam orquestração entre agentes.
- **Diagramação aplicada automaticamente, sem aprovação** — rejeitada: um erro do modelo viraria uma tiragem impressa, que não tem desfazer.

## Consequências

**Positivas:** recomendação aterrada no catálogo real; a loja continua respondendo mesmo sem IA (fallback por regras); custo controlado pelo tiering e pelos limites; dados de leitores não saem da plataforma; trocar de modelo ou de provedor é configuração ou um adapter novo (ADR 003).

**Negativas:** novo componente de dados para operar (PostgreSQL + pgvector), ao lado do MySQL; a recomendação fica no máximo 2 s mais lenta antes do fallback; a qualidade depende da sinopse e dos metadados cadastrados; mais lock-in na AWS pelo uso do Bedrock, mitigado pela porta `ModeloLinguagemGateway`.

## Governança e Fitness Function

- **Regra de import:** só `src/ia/infra/**` importa SDKs de modelo e de banco vetorial; `src/backend/**` não importa nada de `src/ia/**`.
- **Testes dos guardrails:** higienização de PII (e-mail, CPF e telefone removidos), validação do JSON Schema e descarte de ISBN fora dos candidatos.
- **Teste de fallback:** com o modelo simulado lançando erro ou demorando mais de 2 s, o recomendador devolve a lista por regras.
- **Monitoramento:** latência e taxa de fallback da recomendação, tokens e custo por dia, propostas de diagramação aprovadas x rejeitadas pelo editor. Alertas: fallback acima de 20% por 15 minutos e orçamento mensal da IA acima do teto definido pela editora.
