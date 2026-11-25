# ADR 009 — Content-Based Router para o fluxo de publicação híbrida

| Campo | Valor |
|---|---|
| **Status** | Aceito |
| **Sprint** | Sprint 4 — Entrega final (SGE2) |
| **Data** | Novembro de 2026 |
| **Projeto** | Agile Dead Trees — Editora Digital (Grupo Nexus) |
| **Relação com outras ADRs** | Complementa a ADR 007 (troca o fanout simples por roteamento por conteúdo); usa o campo `formatos` do schema `Livro` da ADR 005; a fila de impressão da ADR 006 passa a receber só livros impressos; entrega eventos aos contextos da ADR 008 e ao módulo de IA da ADR 010 |

## Contexto

Na ADR 007, o evento `livro.publicado` vai para um tópico SNS com duas assinaturas fixas (`loja-atualizar` e `impressao-solicitar`): todo livro chega a todas as filas, e cada consumidor descobre sozinho se aquele livro lhe interessa. Com a publicação híbrida isso piora: um e-book puro não deve gerar ordem de impressão, um livro só impresso não deve gerar arquivo digital, e o novo módulo de IA (ADR 010) também precisa receber os livros. Deixar a decisão espalhada nos consumidores cria `if/else` em cada um, gasta chamadas de fila à toa e esconde a regra de negócio "para onde vai cada livro".

## Decisão

Aplicar o padrão de integração **Content-Based Router** (Enterprise Integration Patterns), com a regra em código e a entrega pelo próprio SNS:

1. **Regra no código:** o `RoteadorPublicacao` (`src/integracao/mensageria/roteador-publicacao.ts`) lê o conteúdo do `Livro` e devolve os canais de destino:

   | Condição no conteúdo | Canal | Fila SQS |
   |---|---|---|
   | sempre | `LOJA` | `loja-atualizar` (ficha na vitrine) |
   | `formatos` contém `EBOOK` | `EBOOK` | `ebook-distribuir` (arquivo digital para a loja) |
   | `formatos` contém `IMPRESSO` | `IMPRESSAO` | `impressao-solicitar` (gráfica, com a resiliência da ADR 006) |
   | sempre | `IA` | `ia-indexar` (índice de recomendação, ADR 010) |

2. **Entrega pelo broker:** o `SnsPublicadorEventos` grava os canais no atributo de mensagem `canais` (tipo `String.Array`). Cada assinatura SQS tem uma **filter policy** sobre esse atributo (arquivo `infra/sns-filter-policies.json`); o SNS só entrega a mensagem às filas cujo canal está na lista.
3. A regra continua em um único lugar (o roteador). As filter policies só repetem os nomes dos canais e nunca contêm regra de negócio.
4. Um livro sem nenhum canal de produção (nem `EBOOK` nem `IMPRESSO`) é barrado antes, pela validação do contrato (`formatos` tem `minItems: 1`, ADR 005).

## Alternativas consideradas

- **Manter o fanout e filtrar em cada consumidor** — rejeitada: espalha a regra, gera mensagens e cobranças inúteis e obriga cada consumidor a conhecer `formatos`.
- **Router só no SNS, com a regra escrita na filter policy** — rejeitada: a regra sairia do código, sem teste unitário e sem revisão no pull request.
- **Router como consumidor intermediário** (uma fila de entrada e um serviço que republica) — rejeitada: acrescenta uma fila, um salto e um ponto de falha sem ganho, já que o SNS faz a entrega por atributo.
- **Um tópico por formato** (`livro-ebook-publicado`, `livro-impresso-publicado`) — rejeitada: um livro híbrido teria de ser publicado em dois tópicos, e a ordem de publicação viraria um problema.

## Consequências

**Positivas:** a regra "para onde vai cada livro" fica explícita, testável e revisada em pull request; nenhum consumidor recebe mensagem que não lhe interessa; incluir um canal novo é acrescentar uma linha no roteador, uma fila e uma assinatura, sem mexer nos outros consumidores (OCP); o custo por mensagem cai, porque o SNS não entrega às filas filtradas.

**Negativas:** a lista de canais existe em dois lugares (enum no código e filter policies); uma divergência faria uma fila parar de receber mensagens — por isso há a fitness function abaixo; o roteamento depende de um recurso específico do SNS, o que aumenta o lock-in já aceito na ADR 007.

## Governança e Fitness Function

- **Teste unitário do roteador:** cobre e-book puro, impresso puro e híbrido.
- **Teste de consistência:** compara o enum `Canal` do código com os valores das filter policies em `infra/sns-filter-policies.json` e falha o build se algum canal estiver sobrando ou faltando.
- **Monitoramento:** número de mensagens entregues por fila; alerta se `loja-atualizar` ficar 30 minutos sem receber mensagens durante o horário comercial (sinal de filtro quebrado).
