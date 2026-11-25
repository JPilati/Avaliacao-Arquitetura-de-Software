# ADR 005 — Contrato-primeiro e regra de comunicação síncrona/assíncrona

| Campo | Valor |
|---|---|
| **Status** | Aceito (item 2, protocolo da Mensageria, substituído pela ADR 007) |
| **Sprint** | Sprint 3 (ADR 1 da sprint: como os contêineres se comunicam e como o payload central é especificado) |
| **Data** | Outubro de 2026 |
| **Projeto** | Agile Dead Trees — Editora Digital (Grupo Nexus) |
| **Relação com outras ADRs** | Detalha as ADRs 002 e 004; usa as portas da ADR 003; item 2 atualizado pela ADR 007 |

## Contexto

As ADRs 002 e 004 já colocam etapas lentas em eventos, mas não dizem quando um fluxo deve ser síncrono ou assíncrono, nem qual protocolo usar. O payload `Livro` existia só nas interfaces TypeScript da ADR 003, sem contrato formal; API, evento, CMS e mainframe podiam interpretar o mesmo dado de formas diferentes. Os drivers continuam sendo livro na loja em até 10 minutos e picos de 500 requisições por segundo.

## Decisão

1. Um fluxo só é síncrono quando o usuário espera a resposta e o destino é controlado pela equipe (F1 a F4); toda chamada a sistema externo roda atrás de uma fila, mesmo que a chamada final seja síncrona (F5 a F11).
2. Protocolos padrão: HTTPS com REST/JSON para APIs, AMQP 0-9-1 para a Mensageria, SFTP para arquivos em lote e OTLP sobre gRPC para telemetria. **Atualização:** a partir da ADR 007, a Mensageria usa a API HTTPS do Amazon SNS e do Amazon SQS no lugar do AMQP 0-9-1.
3. Contrato-primeiro: o arquivo `publicacao-api.yaml` (OpenAPI 3.0.3) é a fonte de verdade; os tipos TypeScript são gerados dele e o mesmo schema `Livro` descreve o evento `livro.publicado`.
4. A publicação responde `202 Accepted` com `Location` e exige `Idempotency-Key`.
5. Versão no caminho (`/v1`); dentro de uma versão só entram mudanças compatíveis.

## Alternativas consideradas

- **gRPC com .proto** — rejeitada: o cliente é o navegador, que exigiria proxy gRPC-Web, e a pilha atual é REST.
- **Tudo síncrono** — rejeitada: um mainframe lento travaria a API e descumpre a ADR 002.
- **Tudo assíncrono, inclusive consultas** — rejeitada: catálogo e pedidos precisam de resposta imediata, como já registrado na ADR 004.
- **Código-primeiro, gerando o OpenAPI a partir do código** — rejeitada: o contrato mudaria sem revisão explícita.
- **GraphQL** — rejeitada: um único payload de escrita não justifica a camada extra.

## Consequências

**Trade-offs:** ganha-se desacoplamento temporal e um contrato único; perde-se a consistência imediata: o editor vê `RECEBIDA` antes de `DISPONIVEL_NA_LOJA` e precisa consultar o status. JSON é maior e mais lento de serializar que Protobuf, custo aceitável a 500 requisições por segundo. Contrato-primeiro obriga a alterar o `.yaml` antes do código. A idempotência exige guardar as chaves recebidas por 24 horas.

**Vantagens adquiridas:** a API responde sem depender de nenhum sistema legado, o que protege o tempo de resposta nos picos. Um único arquivo documenta API e evento, e o Swagger UI gera a documentação navegável para quem integra. Payload inválido é barrado na entrada (400) em vez de falhar no mainframe minutos depois. Retentativas do navegador e da ADR 006 não duplicam publicação nem tiragem.

## Governança e Fitness Function

- **A cada pull request:** lint do contrato com Spectral; comparação com o contrato da branch principal (oasdiff), que falha o build se houver quebra dentro da `/v1`; testes de integração que validam cada mensagem publicada contra o schema `Livro`.
- **Em execução:** express-openapi-validator valida requisição e resposta de todos os endpoints.
- **Regra de import** (dependency-cruiser, ADR 003): só a Camada de Integração importa clientes de rede (cliente HTTP, SFTP e o cliente da Mensageria — o AWS SDK do SNS/SQS a partir da ADR 007).
- **Meta acompanhada no Monitoramento:** p95 de F1 até 300 ms.
