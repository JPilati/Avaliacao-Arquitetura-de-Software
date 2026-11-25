# ADR 002 — Eventos assíncronos no processo de publicação

| Campo | Valor |
|---|---|
| **Status** | Aceito |
| **Sprint** | Sprint 1 |
| **Data** | Agosto de 2026 |
| **Projeto** | Agile Dead Trees — Editora Digital (Grupo Nexus) |
| **Relação com outras ADRs** | Regra de comunicação detalhada pela ADR 005; tratamento de falhas detalhado pela ADR 006; tecnologia da Mensageria definida pela ADR 007; distribuição por conteúdo definida pela ADR 009 |

## Contexto

O processo de publicação envolve várias etapas e sistemas. Exigir que o CMS, o processamento editorial, a loja e os sistemas de impressão respondam simultaneamente aumentaria o tempo de publicação e tornaria o fluxo vulnerável à indisponibilidade de um único componente.

## Decisão

Utilizar mensageria e eventos assíncronos nas etapas que não exigem resposta imediata. Após a aprovação de um livro, a plataforma produzirá um evento de publicação, consumido de forma independente e possivelmente paralela pelos serviços interessados.

## Alternativas consideradas

- **Comunicação totalmente síncrona por APIs** — rejeitada: a indisponibilidade do mainframe ou de outro componente bloquearia todo o processo.
- **Processamento manual em lote** — rejeitada: aumentaria o time-to-market e manteria atividades manuais no fluxo.
- **Eventos assíncronos e mensageria** — selecionada: reduz o acoplamento, permite processamento independente e melhora a tolerância a falhas temporárias.

## Consequências

**Positivas:** sistemas menos acoplados, processamento paralelo e falhas temporárias tratadas sem bloquear todo o fluxo, facilitando novas integrações e reduzindo o tempo de publicação.

**Negativas:** maior complexidade (mensagens duplicadas, retentativas, monitoramento de filas) e inconsistência temporária entre os sistemas, pois nem todos processam a atualização no mesmo instante.

**Trade-off:** menos acoplamento e mais disponibilidade ao custo de complexidade operacional e consistência eventual.

## Governança e Fitness Function

Cada consumidor deve possuir tratamento de idempotência, política de retentativa e fluxo definido para mensagens não processáveis automaticamente — essa é a verificação objetiva da decisão. Eventos que falharem repetidamente vão para uma fila de erro (dead-letter queue) para análise operacional.
