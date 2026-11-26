# Testes e Fitness Functions (Governança Automatizada)

Projeto Agile Dead Trees — Editora Digital (Grupo Nexus). As regras vêm das seções de Governança das ADRs e são verificadas automaticamente.

## Como executar

```bash
npm install
npm test                 # compila e roda os 21 testes (node:test)
npm run test:arquitetura # regras de dependência com dependency-cruiser
```

O projeto é Node.js + TypeScript (ADR 004), por isso as regras de arquitetura usam **dependency-cruiser** e testes com `node:test`, que cumprem o mesmo papel do **ArchUnit** em Java/.NET.

## Fitness functions de arquitetura

| # | Regra | Origem | Onde é verificada |
|---|---|---|---|
| 1 | A camada de Domínio (`backend/regras-de-negocio`) não referencia nenhum outro pacote, inclusive a Infraestrutura | ADR 003 | `test/arquitetura.test.ts` (Regra 1) e `.dependency-cruiser.cjs` (`nucleo-isolado`) |
| 2 | Toda dependência de infraestrutura do núcleo é uma interface (porta) implementada fora dele: `ImpressoraGateway`, `PublicadorEventos` | ADR 003 | Regras 1 a 3; o núcleo só contém `interface` e `type` |
| 3 | `backend/aplicacao` só depende do núcleo | ADR 003 | Regra 2 e `aplicacao-so-depende-do-nucleo` |
| 4 | A ACL (`integracao`) não conhece aplicação, API nem IA | ADR 008 | Regra 3 e `acl-nao-conhece-aplicacao` |
| 5 | O módulo de IA não conhece backend nem integração | ADR 010 | Regra 4 e `ia-isolada` |
| 6 | Formatos legados (XML, EDI, SFTP) só existem dentro da ACL | ADR 008 | Regra 6 |
| 7 | SDKs de rede, AWS, SFTP e modelos só são importados pela integração e por `src/ia/infra` | ADR 005, 007, 010 | `clientes-de-rede-so-na-integracao` |
| 8 | Nenhum ciclo de dependência | ADR 003 | `sem-ciclos` |
| 9 | Canais do Content-Based Router iguais às filter policies do SNS | ADR 009 | `test/roteador-publicacao.test.ts` |
| 10 | Todo canal de gráfica devolve o adapter envolvido na resiliência | ADR 008 e 006 | `test/acl-grafica.test.ts` |

A regra 1 foi testada com uma violação proposital (um import de `integracao` dentro de `regras-de-negocio`): o teste e o dependency-cruiser falharam, e o build seria bloqueado.

## Testes de comportamento

| Área | O que é verificado | Arquivo |
|---|---|---|
| ACL XML | `tiragem` → `<QTD>`, `14x21` → `P1421`, `BROCHURA` → `BR`; leitura do `ID_JOB` da resposta | `test/acl-grafica.test.ts` |
| ACL EDI | Segmentos `QTY+21:` e `IMD+F+PAP` | `test/acl-grafica.test.ts` |
| Circuit Breaker | Abre com 50% de falhas após o volume mínimo, corta chamadas e fecha após a chamada de teste | `test/acl-grafica.test.ts` |
| Content-Based Router | E-book puro, impresso puro e híbrido; atributo `String.Array` no SNS | `test/roteador-publicacao.test.ts` |
| Guardrails de IA | Remoção de PII; ISBN fora dos candidatos descartado; enums da diagramação | `test/ia.test.ts` |
| Fallback de IA | Saída inválida e modelo lento caem na recomendação por regras | `test/ia.test.ts` |

## Fitness functions de operação (fora do código)

| Regra | Origem |
|---|---|
| Contrato OpenAPI: lint com Spectral e quebra de `/v1` detectada com oasdiff a cada pull request | ADR 005 |
| Teste de caos com Toxiproxy no gateway do mainframe (circuito abre em até 60 s, p95 de F1 inalterado) | ADR 006 |
| Testes de integração com SNS/SQS emulados (LocalStack ou ElasticMQ) | ADR 007 |
| Script de métricas Ca, Ce, I, A e D por pacote, com D = 0 no fluxo de publicação | ADR 003 |
| Alertas de orçamento da Mensageria e da IA | ADR 007 e 010 |
