# ADR 001 — Camada de integração para sistemas legados

| Campo | Valor |
|---|---|
| **Status** | Aceito |
| **Sprint** | Sprint 1 |
| **Data** | Agosto de 2026 |
| **Projeto** | Agile Dead Trees — Editora Digital (Grupo Nexus) |
| **Relação com outras ADRs** | Detalhada em nível de componente pela ADR 003, mantida pelo estilo da ADR 004 e formalizada como Camada Anti-Corrupção (ACL) pela ADR 008 |

## Contexto

A editora possui fontes e sistemas heterogêneos: CMS de autoria, planilhas Excel, plataforma de compras e mainframes associados às instalações de impressão. A integração direta entre eles aumentaria o acoplamento, dificultaria a evolução da solução e elevaria o risco de mudanças futuras.

## Decisão

Utilizar uma camada central de integração baseada em APIs e adaptadores, responsável por receber, transformar, validar e encaminhar dados entre os sistemas. Cada sistema legado possuirá um adaptador específico, de modo que os demais sistemas não precisem conhecer sua tecnologia, interfaces internas ou formatos particulares.

## Alternativas consideradas

- **Integração ponto a ponto** — rejeitada: multiplicaria dependências e dificultaria a evolução.
- **Substituição imediata do legado** — rejeitada: alto risco, custo e impacto operacional de uma migração completa.
- **Camada de integração com APIs e adaptadores** — selecionada: isola sistemas, preserva o legado e permite novas integrações de forma controlada.

## Consequências

**Positivas:** aumenta a interoperabilidade, reduz o acoplamento, permite integrar novos sistemas por novos adaptadores e mantém isoladas as mudanças no legado, reduzindo o tempo para disponibilizar funcionalidades.

**Negativas:** introduz um componente arquitetural adicional a monitorar e operar; os adaptadores precisam ser desenvolvidos, testados e mantidos; uma falha na camada pode afetar vários fluxos ao mesmo tempo, exigindo observabilidade e mecanismos de recuperação.

## Governança e Fitness Function

Toda integração externa deve passar por uma API ou adaptador oficialmente registrado, com contrato documentado e testes automatizados associados — essa é a verificação objetiva da decisão. A loja digital não pode acessar diretamente bancos de dados ou interfaces internas dos sistemas legados.
