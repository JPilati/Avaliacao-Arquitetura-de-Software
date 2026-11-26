# Atributos de Qualidade e Matriz QAW

Projeto Agile Dead Trees — Editora Digital (Grupo Nexus). Os três primeiros atributos vêm do Mini-QAW da Sprint 1; os dois últimos foram acrescentados com as decisões das Sprints 3 e 4.

## Priorização

| Prioridade | Atributo | Justificativa | Decisões que o sustentam |
|---|---|---|---|
| 1 | Time-to-market | O objetivo do negócio é levar o livro aprovado à loja o mais rápido possível. | ADR 002, ADR 004, ADR 009 |
| 2 | Interoperabilidade | CMS, planilhas, loja, mainframe (XML) e gráficas (EDI) usam formatos diferentes. | ADR 001, ADR 005, ADR 008 |
| 3 | Escalabilidade | Lançamentos e promoções geram picos na loja. | ADR 004, ADR 007 |
| 4 | Disponibilidade / Resiliência | O mainframe e o provedor de IA estão fora do controle da equipe. | ADR 006, ADR 010 |
| 5 | Desempenho | O editor e o leitor não podem esperar pelo legado. | ADR 005, ADR 010 |

## Cenários (Fonte → Estímulo → Artefato → Ambiente → Resposta → Medida)

| Atributo | Fonte | Estímulo | Artefato | Ambiente | Resposta | Medida da resposta |
|---|---|---|---|---|---|---|
| **Time-to-market** | Editor | Aprova um livro para publicação | Fluxo de publicação (F1 → F5 → F6 → F7) | Operação normal | Valida, publica o evento e envia a ficha à vitrine | Livro disponível para compra em até **10 minutos** após a aprovação, sem redigitação |
| **Interoperabilidade** | CMS, planilha, mainframe ou gráfica parceira | Envio ou recebimento de dados de um livro | Camadas Anti-Corrupção | Operação normal ou carga de dados | Traduz, valida e encaminha ao contexto correto | **99%** das integrações válidas processadas sem intervenção manual; uma gráfica nova entra sem alterar o núcleo |
| **Escalabilidade** | Leitores da loja | Lançamento de um livro | API REST, catálogo e recomendação | Pico de acesso | Réplicas sem estado atendem; filas absorvem o trabalho assíncrono | **500 requisições por segundo** (BOTE da Sprint 1) com as operações essenciais disponíveis |
| **Disponibilidade / Resiliência** | Mainframe ou provedor de IA | Lentidão de 10 s ou respostas 503 | Gateway de impressão e recomendador | Produção | Circuit breaker abre e o fallback assume (impressão adiada; recomendação por regras) | Circuito aberto em até **60 s**; livro continua na loja; nenhuma ordem duplicada; leitor nunca vê erro |
| **Desempenho** | Editor | Envia `POST /v1/publicacoes` | API REST | Pico de 500 req/s | Responde 202 sem esperar nenhum sistema legado | **p95 de F1 ≤ 300 ms**; recomendação com timeout de **2 s** antes do fallback |

## Estimativas BOTE (Sprint 1)

- **Carga:** 50.000 visitas/dia × 20 requisições = 1.000.000 req/dia ≈ 11,6 QPS médio; × 20 (pico) ≈ 232 QPS; × 2 (margem) ≈ 464 QPS → **500 QPS planejados**.
- **Armazenamento em 5 anos:** 100 livros/dia × 365 × 5 = 182.500 livros × 25 MB ≈ 4,56 TB primários → **cerca de 10 TB** com replicação e backups.
- **Mensageria (Sprint 4):** cerca de 600 mil mensagens por mês ([ADR 007](../../adrs/007-selecao-tecnologica-mensageria.md)).

## Trade-offs essenciais

- **Time-to-market x consistência imediata:** o editor recebe 202 e acompanha o status; a loja e a gráfica são atualizadas de forma assíncrona.
- **Interoperabilidade x manutenção:** cada formato legado tem um adapter próprio para manter.
- **Custo x portabilidade:** SNS/SQS e Bedrock reduzem custo e operação, mas aumentam o lock-in na AWS, contido pelas portas da ADR 003.
- **IA x previsibilidade:** a IA melhora recomendação e diagramação, mas é probabilística; guardrails, fallback e aprovação do editor limitam o risco.
