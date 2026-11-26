# ADR 007 — Seleção tecnológica da Mensageria: Amazon SQS com SNS

| Campo | Valor |
|---|---|
| **Status** | Aceito |
| **Sprint** | Sprint 4 |
| **Data** | Novembro de 2026 |
| **Projeto** | Agile Dead Trees — Editora Digital (Grupo Nexus) |
| **Redação** | Ricardo Betto, líder da sprint |
| **Relação com outras ADRs** | Substitui o AMQP 0-9-1 do item 2 da ADR 005. Mantém todos os mecanismos da ADR 006, implementados com recursos do SQS. Não altera o núcleo (ADR 003). Complementada pela ADR 009, que troca o fanout simples por roteamento por conteúdo com filtros de assinatura do SNS |

## Contexto

O RabbitMQ entrou no protótipo da Sprint 2 sem avaliação formal. A Mensageria carrega os fluxos F5, F6, F9 e F10, sustenta o prazo de 10 minutos e toda a resiliência da ADR 006. A equipe tem três pessoas, não tem time de plataforma e o case não informa orçamento. O volume previsto é de cerca de 600 mil mensagens por mês.

## Decisão

1. A Mensageria passa a ser o Amazon SNS (um tópico por evento) com filas padrão do Amazon SQS (uma por consumidor), na mesma região do MySQL.
2. O adaptador `SnsPublicadorEventos` substitui o `RabbitMqPublicadorEventos` na porta `PublicadorEventos`, e o `ConsumidorEventoPublicacao` passa a ler do SQS; o núcleo não muda (ADR 003).
3. Os fluxos F5, F6, F9 e F10 passam a usar a API HTTPS do SNS e do SQS pelo AWS SDK; a natureza continua assíncrona.
4. Cada evento é gravado numa tabela outbox na mesma transação do dado, e o consumidor registra as mensagens já processadas para descartar duplicatas, pois o SQS entrega pelo menos uma vez.
5. A fila padrão não garante ordem; um evento com data anterior à do status já gravado é ignorado.
6. Os consumidores usam long polling de 20 segundos.

### Como cada mecanismo da ADR 006 fica no SQS

| Mecanismo da ADR 006 | Sprint 3 (RabbitMQ) | A partir da ADR 007 (SQS + SNS) |
|---|---|---|
| Fanout de `livro.publicado` | Exchange fanout | Tópico SNS com duas assinaturas SQS: `loja-atualizar` e `impressao-solicitar` |
| Confirmação de envio | Publisher confirm | Resposta síncrona da chamada Publish do SNS |
| Confirmação de consumo | Ack manual | DeleteMessage depois do processamento; sem ele, a mensagem volta ao fim do visibility timeout |
| Limite de chamadas ao mainframe | Prefetch = 5 | No máximo 5 mensagens em processamento por consumidor |
| Retry Nível 2 (1, 5 e 15 min) | Filas de espera com TTL e dead-letter exchange | ChangeMessageVisibility de 60, 300 e 900 segundos |
| Adiamento do fallback (5 min, não conta como tentativa) | Fila `impressao.espera` com TTL | Nova mensagem com DelaySeconds = 300 e exclusão da original, o que zera a contagem |
| DLQ com alerta | `impressao.dlq` por dead-letter exchange | Redrive para `impressao-solicitar-dlq` com maxReceiveCount = 4 (entrega original + 3 reentregas) |

## Alternativas consideradas

Matriz ponderada (nota de 1 a 10; entre parênteses, nota × peso):

| Critério | Peso | RabbitMQ (Amazon MQ) | Kafka (Amazon MSK) | SQS + SNS |
|---|---|---|---|---|
| Aderência ao fluxo da ADR 006 | 5 | 10 (50) | 4 (20) | 8 (40) |
| TCO em 3 anos | 5 | 3 (15) | 4 (20) | 10 (50) |
| Operabilidade sem time de plataforma | 4 | 7 (28) | 4 (16) | 10 (40) |
| Domínio da equipe e ramp-up | 3 | 9 (27) | 3 (9) | 6 (18) |
| Portabilidade e risco de lock-in | 3 | 9 (27) | 8 (24) | 3 (9) |
| Vazão para os picos | 2 | 8 (16) | 10 (20) | 9 (18) |
| **Pontuação total ponderada** | | **163** | **109** | **175** |

- **RabbitMQ no Amazon MQ (163 pontos)** — rejeitado: é o mais aderente ao desenho atual e o que a equipe conhece, mas o cluster de produção custa cerca de US$ 690 por mês ligado, mesmo sem publicações. A instância única, mais barata, perde a alta disponibilidade.
- **Kafka no Amazon MSK (109 pontos)** — rejeitado: é um log de eventos feito para alto volume e replay, recursos que o fluxo não usa. Atraso e DLQ teriam de ser construídos à mão, e a operação de partições pesa para três pessoas.
- **Manter o RabbitMQ sem avaliação** — rejeitado: deixaria a decisão mais cara do projeto sem justificativa registrada.

A vitória do SQS + SNS se mantém em quase todas as variações de peso testadas. Ela só se inverte se o TCO cair para peso 3, e empata se a portabilidade subir para peso 5.

## Consequências

**TCO:** a Mensageria custa cerca de US$ 0,73 por mês, US$ 8,82 no primeiro ano e US$ 26,45 em 3 anos (R$ 133), contra US$ 24,9 mil do RabbitMQ e US$ 19,7 mil do Kafka no mesmo período. Com 10 vezes o volume previsto, o custo em 3 anos sobe para cerca de US$ 278. Não há licença, servidor nem janela de manutenção para pagar ou operar.

**Ganhos:** nenhum broker para dimensionar ou atualizar; filas que escalam sem configuração; os mesmos mecanismos de resiliência da ADR 006; custo proporcional ao uso.

**Riscos assumidos e mitigação:**

| Risco | Efeito | Mitigação |
|---|---|---|
| Lock-in na AWS | Trocar de provedor exige reescrever os adaptadores de Mensageria | O núcleo só conhece a porta `PublicadorEventos` (ADR 003); a troca fica restrita à Integração |
| Teste local depende de emulação | Diferenças entre o emulador e o SQS real podem esconder erros | Testes de integração no SQS de homologação antes de cada release |
| Fila padrão sem ordem garantida | Um status de impressão antigo pode chegar depois de um novo | Comparar a data do evento com a data do status gravado e ignorar o mais antigo |
| Atraso máximo de 15 minutos | Limita esperas de retry maiores no futuro | A maior espera da ADR 006 já é de 15 minutos; esperas maiores ficam no fallback, que reenvia a mensagem |
| Long polling mal configurado | Consultas vazias aumentam o número de requisições cobradas | Long polling de 20 segundos e alerta de orçamento mensal |
| Retrabalho da Sprint 3 | Dois adaptadores e o código de reentrega mudam | O contrato OpenAPI, o núcleo e a lógica de resiliência continuam iguais |

## Governança e Fitness Function

- **Pipeline:** testes de integração com SQS e SNS emulados (LocalStack ou ElasticMQ) validam cada evento contra o schema `Livro` da ADR 005.
- **Regra de import:** só a Camada de Integração importa os clientes do SQS e do SNS do AWS SDK; a regra da ADR 005 é atualizada.
- **Caos:** a fitness function da ADR 006 continua no pipeline de homologação, agora com o SQS real.
- **Monitoramento:** idade da mensagem mais antiga por fila, com alerta se `loja-atualizar` passar de 5 minutos (metade do prazo de 10); alerta para qualquer mensagem em DLQ; alerta de orçamento se a Mensageria passar de US$ 10 por mês.
- **Radar:** a posição de cada tecnologia no radar de tecnologia é revista a cada sprint.
- **Revisão:** reabrir esta ADR se o volume passar de 100 milhões de mensagens por mês, se surgir necessidade de replay de eventos (Kafka está em Assess no radar) ou se a editora informar um orçamento que torne o custo fixo de um broker irrelevante.
