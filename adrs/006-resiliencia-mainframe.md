# ADR 006 — Resiliência ativa na integração com o mainframe de impressão

| Campo | Valor |
|---|---|
| **Status** | Aceito (mecanismos mantidos pela ADR 007, agora implementados com Amazon SQS) |
| **Sprint** | Sprint 3 (ADR 2 da sprint: tática que protege o sistema do seu elo mais fraco) |
| **Data** | Outubro de 2026 |
| **Projeto** | Agile Dead Trees — Editora Digital (Grupo Nexus) |
| **Relação com outras ADRs** | Complementa a ADR 002; implementada sobre a porta da ADR 003; implementação da fila atualizada pela ADR 007; a fila de impressão passa a receber só livros com formato impresso (ADR 009); o decorador é aplicado pelo Factory Method da ADR 008 |

## Contexto

O fluxo F8 chama de forma síncrona um mainframe legado, sem SLA publicado e fora do controle da equipe. Sem proteção, uma lentidão do mainframe prende os consumidores, faz a fila crescer e, nas retentativas, pode gerar ordens de impressão duplicadas. A ADR 002 garante que o editor não espera a impressão, mas não diz o que fazer quando o mainframe falha.

## Decisão

1. Isolar a impressão em fila própria (fanout de `livro.publicado`), com no máximo 5 mensagens em processamento por consumidor.
2. Timeout de 1 s para conexão e 5 s para resposta.
3. Retry em dois níveis: até 3 novas tentativas no consumidor com backoff exponencial e jitter total (até 0,5 s, 1 s e 2 s), só para erros transitórios; depois, reentregas pela fila após 1, 5 e 15 minutos e, por fim, a DLQ com alerta.
4. Circuit Breaker com janela rolante de 60 s, volume mínimo de 10 chamadas, abertura com 50% de falhas, 30 s aberto e 1 chamada de teste no estado meio-aberto.
5. Fallback: com o circuito aberto, a solicitação vai para a espera de impressão (volta em 5 min), é publicado `impressao.adiada`, o status passa a `AGUARDANDO_GRAFICA` e o livro continua na loja.
6. Tudo implementado como decorador da porta `ImpressoraGateway` (`ImpressoraGatewayResiliente`), sem tocar no núcleo.

**Implementação na fila:** na Sprint 3, os mecanismos usavam recursos do RabbitMQ (exchange fanout, prefetch, filas com TTL e dead-letter exchange). A partir da ADR 007, os mesmos mecanismos usam SNS + SQS (tópico com duas assinaturas, ChangeMessageVisibility de 60, 300 e 900 s, DelaySeconds = 300 no fallback e redrive para DLQ com maxReceiveCount = 4).

## Alternativas consideradas

- **Só Timeout** — rejeitada: corta a espera, mas continua martelando um mainframe que já caiu.
- **Só Retry** — rejeitada: multiplica a carga justamente quando o mainframe está sobrecarregado.
- **Retry sem jitter** — rejeitada: todos os consumidores voltam no mesmo instante.
- **Falhar a publicação quando a impressão falha** — rejeitada: tira da loja um livro digital que não depende da gráfica.
- **Service mesh com Istio** — rejeitada nesta fase: exige Kubernetes e operação que a equipe de três pessoas não tem; a biblioteca opossum resolve dentro do processo.

## Consequências

**Trade-offs:** ganha-se previsibilidade; perde-se imediatismo: no pior caso a impressão pode atrasar mais de 22 minutos até a DLQ, ou horas com o mainframe fora. Os valores de 5 s e 50% partem de uma premissa de latência normal de até 2 s e podem gerar falso positivo (abrir o circuito numa lentidão breve) ou falso negativo até serem ajustados com medição real. Há mais estados para operar: filas de espera, DLQ e circuito aberto. A correção de repetir depende da idempotência no lado do mainframe.

**Vantagens adquiridas:** uma falha do mainframe não se propaga: API, loja e prazo de 10 minutos ficam intactos. O consumidor nunca fica preso mais de 23,5 s por mensagem. O mainframe ganha tempo para se recuperar, porque o circuito aberto corta a carga. Nenhuma tiragem duplicada por retentativa. O editor sabe o que está acontecendo (`AGUARDANDO_GRAFICA`) em vez de ver um erro. A tática é trocável sem mexer no negócio, e as métricas da Sprint 2 continuam em D = 0.

## Governança e Fitness Function

- **Fitness function de caos** no pipeline de homologação: um proxy de falhas (Toxiproxy) injeta 10 s de latência e respostas 503 no gateway do mainframe; o teste passa só se o circuito abrir em até 60 s, o p95 de F1 não mudar, nenhuma ordem for duplicada e as mensagens chegarem à espera de impressão.
- **Regra de import:** só `ImpressoraGatewayResiliente` usa `MainframeImpressaoAdapter`, e nenhum outro código chama o mainframe direto.
- **Monitoramento:** estado do circuito, taxa de falhas, p99 do gateway, tamanho da espera de impressão e da DLQ exportados por OpenTelemetry; alertas para mensagem na DLQ e circuito aberto por mais de 2 horas.
- **Revisão** dos parâmetros quando o p99 medido do gateway se afastar da premissa de 2 s.
