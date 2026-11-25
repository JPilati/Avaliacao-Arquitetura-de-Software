# ADR 008 — Bounded Contexts e Camada Anti-Corrupção com Adapter e Factory Method

| Campo | Valor |
|---|---|
| **Status** | Aceito |
| **Sprint** | Sprint 4 — Entrega final (SGE2) |
| **Data** | Novembro de 2026 |
| **Projeto** | Agile Dead Trees — Editora Digital (Grupo Nexus) |
| **Relação com outras ADRs** | Formaliza a camada de integração da ADR 001 como ACL; usa as portas da ADR 003; organiza os módulos do monólito da ADR 004; usa o schema `Livro` da ADR 005 como Published Language; aplica o decorador da ADR 006 |

## Contexto

O desafio final exige publicação híbrida: e-book e impressão física, com um CMS em nuvem de um lado e gráficas legadas que falam XML e EDI do outro. Até a Sprint 4 a fronteira com o legado era tratada como "camada de integração" (ADR 001), mas o projeto não tinha delimitado seus contextos de negócio: os termos `Livro`, `Publicação`, `Pedido de impressão` e `Ficha da vitrine` circulavam com significados diferentes em cada sistema. Além disso, a premissa da Sprint 3 de que o gateway do mainframe aceitaria REST/JSON (fluxo F8) não se confirmou para todas as gráficas: o mainframe responde em XML e as gráficas parceiras trocam arquivos EDI por SFTP. Sem fronteiras explícitas, esses formatos vazariam para o núcleo.

## Decisão

1. **Delimitar cinco Bounded Contexts**, documentados em `docs/ddd/mapa-de-contexto.md`:
   - **Publicação Editorial** (Core Domain): aprovação, regras e status da publicação híbrida.
   - **Produção Gráfica** (Supporting): solicitação, tiragem e status de impressão.
   - **Distribuição Digital** (Supporting): ficha da vitrine e entrega do arquivo do e-book à loja.
   - **Recomendação e Diagramação** (Supporting, AI-Native): ver ADR 010.
   - **Dados Editoriais Legados** (Supporting): carga das planilhas Excel.
   Identidade e Acesso, Pagamentos da loja, Mensageria e Observabilidade são Generic Subdomains, resolvidos com serviços prontos.
2. **Publicação Editorial é upstream** e publica o evento `livro.publicado` com o schema `Livro` da ADR 005, que passa a ser a **Published Language** entre os contextos.
3. **Toda fronteira com sistema externo é uma Camada Anti-Corrupção (ACL)** dentro do pacote `Integracao`. A ACL é feita de Adapters (GoF) que implementam portas do núcleo e traduzem a linguagem do legado para a linguagem ubíqua: `MainframeXmlAdapter` (XML pelo gateway do mainframe) e `GraficaEdiAdapter` (EDI por SFTP) implementam `ImpressoraGateway`; o adaptador do CMS da loja implementa `VitrineGateway`.
4. **A escolha do adapter é feita por Factory Method.** A classe criadora `CanalGrafica` define o método-fábrica `criarAdapter()`; cada subclasse (`CanalMainframeXml`, `CanalGraficaEdi`) cria o seu adapter. O método `gateway()` da criadora sempre envolve o adapter criado no `ImpressoraGatewayResiliente` da ADR 006, de modo que nenhuma gráfica fica sem resiliência. O composition root escolhe o canal pela configuração da gráfica.
5. Cada Bounded Context vira um módulo do monólito (ADR 004), com as mesmas regras de import da ADR 003.

## Alternativas consideradas

- **Modelo único compartilhado (Shared Kernel amplo)** — rejeitada: o `Livro` da loja, o da gráfica e o do CMS têm campos e regras diferentes; um modelo único acopla todos às mudanças de cada um.
- **Conformist com o legado** (usar o XML/EDI no núcleo) — rejeitada: o núcleo passaria a mudar sempre que uma gráfica mudasse de formato e descumpriria a ADR 001.
- **Microsserviço por contexto** — rejeitada nesta fase pelos mesmos motivos da ADR 004; as fronteiras dos módulos permitem extrair um contexto depois.
- **Instanciar os adapters com `if/else` no composition root** — rejeitada: cada gráfica nova exigiria alterar a montagem e seria fácil esquecer o decorador de resiliência. O Factory Method fecha essa regra na classe criadora (OCP).
- **Abstract Factory** — rejeitada: só há um produto variável por gráfica (o adapter); uma família de produtos seria cerimônia.

## Consequências

**Positivas:** a linguagem ubíqua fica protegida — o núcleo só conhece `Livro`, `SolicitacaoImpressao` e `StatusImpressao`; a troca do JSON pelo XML no F8 ficou contida no adapter, sem tocar no núcleo, o que valida a ADR 001 na prática; uma gráfica nova entra com uma subclasse de `CanalGrafica` e um adapter, sem alterar código existente; todo adapter de gráfica nasce com timeout, retry e circuit breaker.

**Negativas:** mais classes de tradução para manter (uma por formato legado); o mapa de contexto precisa ser atualizado quando surgir um sistema externo novo; o EDI exige testes com arquivos de exemplo de cada gráfica parceira.

## Governança e Fitness Function

- **Regra de import:** só `src/integracao/**` pode conter os termos e bibliotecas de XML, EDI e SFTP; `src/backend/regras-de-negocio` continua sem importar nenhum outro pacote (ADR 003).
- **Teste de contrato da ACL:** cada adapter tem teste que converte uma `SolicitacaoImpressao` de exemplo e compara com o documento esperado (XML ou EDI) e vice-versa.
- **Teste do Factory Method:** todo `CanalGrafica` deve devolver um `ImpressoraGatewayResiliente`; o teste falha se um canal devolver o adapter sem decorador.
- **Revisão:** reabrir esta ADR se um contexto precisar escalar ou ser implantado de forma independente (critério da ADR 004).
