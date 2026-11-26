# C4 Nível 3 — Diagrama de Componentes

Projeto Agile Dead Trees — Editora Digital (Grupo Nexus). Componentes do artefato da plataforma, com os pacotes da Sprint 2 ([ADR 003](../../adrs/003-refatoracao-dip-guiada-por-metricas.md)) e os módulos dos Bounded Contexts ([ADR 008](../../adrs/008-bounded-contexts-e-acl.md)). Cada caixa corresponde a uma pasta em `src/`.

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#ffffff','primaryTextColor':'#000000','primaryBorderColor':'#000000','lineColor':'#000000','clusterBkg':'#ffffff','clusterBorder':'#000000','fontSize':'13px'}}}%%
flowchart TB
  subgraph APIR["api-rest"]
    CTRL["PublicacaoController"]
    RCTRL["RecomendacaoController"]
  end
  subgraph APP["backend/aplicacao"]
    PUB["PublicarLivro<br/>implementa PublicarLivroUseCase"]
  end
  subgraph CORE["backend/regras-de-negocio — só contratos (A = 1)"]
    PORTAS["Portas: PublicarLivroUseCase,<br/>ImpressoraGateway, PublicadorEventos"]
    MOD["Modelo: Livro, SolicitacaoImpressao"]
  end
  subgraph INTG["integracao"]
    subgraph GRA["grafica (ACL)"]
      FAB["CanalGrafica<br/>Factory Method"]
      XMLA["MainframeXmlAdapter"]
      EDIA["GraficaEdiAdapter"]
      RES["ImpressoraGatewayResiliente<br/>Decorator + Disjuntor"]
    end
    subgraph MSGR["mensageria"]
      ROT["RoteadorPublicacao<br/>Content-Based Router"]
      SNS["SnsPublicadorEventos"]
    end
  end
  subgraph IAM["ia"]
    REC["RecomendadorLivros"]
    EST["EstrategiaRecomendacao<br/>PorIa / PorRegras"]
    GUA["Guardrails<br/>PII + JSON Schema"]
  end

  CTRL --> PORTAS
  RCTRL --> REC
  PUB -. implementa .-> PORTAS
  PUB --> MOD
  XMLA -. implementa .-> PORTAS
  EDIA -. implementa .-> PORTAS
  RES -. implementa .-> PORTAS
  FAB --> XMLA
  FAB --> EDIA
  FAB --> RES
  SNS -. implementa .-> PORTAS
  SNS --> ROT
  REC --> EST
  EST --> GUA

  classDef default fill:#ffffff,stroke:#000000,color:#000000;
```

## Regras de dependência (verificadas no pipeline)

| Pacote | Pode importar | Não pode importar |
|---|---|---|
| `backend/regras-de-negocio` | nada | qualquer outro pacote |
| `backend/aplicacao` | `regras-de-negocio` | `api-rest`, `integracao`, `ia` |
| `api-rest` | `regras-de-negocio`, `ia` (só a porta de recomendação) | `integracao` |
| `integracao` | `regras-de-negocio` | `aplicacao`, `api-rest`, `ia` |
| `ia` | o próprio módulo | `backend`, `integracao` |

As setas apontam sempre para os contratos do núcleo, o que mantém D = 0 nos pacotes do fluxo de publicação ([ADR 003](../../adrs/003-refatoracao-dip-guiada-por-metricas.md)). A montagem das implementações fica no composition root (`src/main.ts`), único arquivo autorizado a importar classes concretas de todos os módulos.
