# ADR 004 — Estilo arquitetural: monólito modular hexagonal com eventos

| Campo | Valor |
|---|---|
| **Status** | Aceito |
| **Sprint** | Sprint 2 (ADR 2 da sprint: estilo arquitetural adotado para o projeto) |
| **Data** | Outubro de 2026 |
| **Projeto** | Agile Dead Trees — Editora Digital (Grupo Nexus) |
| **Relação com outras ADRs** | Consolida as ADRs 001, 002 e 003; o adaptador de Mensageria citado aqui foi trocado pela ADR 007 sem alterar o estilo; os módulos passam a seguir os Bounded Contexts da ADR 008 e recebem o módulo de IA da ADR 010 |

## Contexto

Drivers da Sprint 1: time-to-market (livro na loja em até 10 minutos após a aprovação), interoperabilidade com CMS, planilhas Excel e mainframe, e escalabilidade para cerca de 500 requisições por segundo em picos. A equipe tem três pessoas e o protótipo roda em Node.js + Express com MySQL. As ADRs 001 e 002 já pedem adaptadores para o legado e eventos para etapas lentas. A refatoração da ADR 003 levou o código a um núcleo de contratos cercado por adaptadores, que é a forma de um estilo conhecido.

## Decisão

Adotar um monólito modular com arquitetura hexagonal (Portas e Adaptadores), com comunicação orientada a eventos nas integrações assíncronas.

- **Núcleo:** `Backend.RegrasDeNegocio` (portas e modelo) e `Backend.Aplicacao` (casos de uso).
- **Adaptadores de entrada:** `ApiRest` (HTTP) e `ConsumidorEventoPublicacao` (mensagens).
- **Adaptadores de saída:** `MainframeImpressaoAdapter`, adaptador de publicação de eventos (na Sprint 2, `RabbitMqPublicadorEventos`; a partir da ADR 007, `SnsPublicadorEventos`) e, nas próximas sprints, adaptadores de Excel, CMS e MySQL.
- Um único artefato implantável, sem estado em memória, replicado atrás de um balanceador de carga para atender aos picos.

## Alternativas consideradas

- **Arquitetura em camadas tradicional** — rejeitada: a dependência de cima para baixo faz o negócio depender da infraestrutura, que é exatamente a estrutura medida como problemática na Sprint 2.
- **Microsserviços** — rejeitada nesta fase: custo de implantação, observabilidade e consistência alto para uma equipe de três pessoas, e 500 QPS são atendidos por réplicas do monólito; os módulos já têm fronteiras que permitem extrair um serviço depois.
- **Arquitetura orientada a eventos como estilo principal** — rejeitada: consulta ao catálogo e cadastro de pedidos precisam de resposta imediata; consistência eventual em tudo complicaria a loja.
- **Microkernel / plug-ins** — rejeitada: indicado para produtos extensíveis por terceiros, que não é o caso.

## Consequências

**Positivas:** o negócio fica isolado da tecnologia, o que permite integrar legados novos sem tocar no núcleo (interoperabilidade); um só deploy e testes do núcleo sem infraestrutura aceleram entregas (time-to-market); réplicas sem estado e a Mensageria absorvendo picos atendem à escalabilidade planejada.

**Negativas:** o monólito escala por inteiro, mesmo que só um módulo esteja sob carga; uma falha grave no artefato afeta todos os fluxos síncronos; a separação entre módulos depende das regras de import, já que tudo roda no mesmo processo; a parte assíncrona traz mensagens duplicadas e consistência eventual (tratadas pela ADR 002).

## Governança e Fitness Function

As regras de import e a meta D = 0 da ADR 003 garantem que nenhum módulo quebre a fronteira hexagonal. Em operação, o monitoramento acompanha QPS, tempo de resposta e tempo entre aprovação e disponibilidade. A decisão deve ser revista se um módulo precisar escalar de forma independente de forma recorrente, ou se o tempo de publicação passar de 10 minutos por limitação do monólito; nesse caso, o módulo candidato a virar serviço é o de integração.
