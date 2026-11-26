# C4 Nível 1 — Diagrama de Contexto

Projeto Agile Dead Trees — Editora Digital (Grupo Nexus). Versão final (Sprint 4). A primeira versão foi feita na Sprint 1; esta acrescenta as gráficas parceiras (EDI) e o provedor de modelos de IA.

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#ffffff','primaryTextColor':'#000000','primaryBorderColor':'#000000','lineColor':'#000000','clusterBkg':'#ffffff','clusterBorder':'#000000','fontSize':'14px'}}}%%
flowchart TB
  ED["Editor / Autor<br/>[Pessoa]<br/>Aprova livros e diagramações"]
  LE["Leitor / Cliente<br/>[Pessoa]<br/>Navega, recebe recomendações e compra"]
  SYS["Plataforma Agile Dead Trees<br/>[Sistema]<br/>Publica livros na loja e na gráfica,<br/>recomenda e propõe diagramação"]:::sistema
  CMSA["CMS de autoria<br/>[Sistema externo, nuvem]"]:::externo
  LOJA["CMS da loja digital<br/>[Sistema externo]"]:::externo
  MF["Mainframe de impressão<br/>[Sistema legado, XML]"]:::externo
  GP["Gráficas parceiras<br/>[Sistemas legados, EDI]"]:::externo
  XLS["Planilhas Excel<br/>[Fonte legada]"]:::externo
  BR["Amazon Bedrock<br/>[Provedor de modelos de IA]"]:::externo

  ED -- "Publica livros e aprova diagramação<br/>HTTPS" --> SYS
  LE -- "Consulta catálogo e recomendações<br/>HTTPS" --> SYS
  SYS -- "Lê conteúdo e metadados aprovados<br/>HTTPS" --> CMSA
  SYS -- "Envia ficha da vitrine e arquivo do e-book<br/>HTTPS" --> LOJA
  SYS -- "Envia ordens de impressão<br/>XML sobre HTTPS" --> MF
  SYS -- "Envia ordens de impressão<br/>EDI sobre SFTP" --> GP
  XLS -- "Preços, estoque, direitos<br/>SFTP em lote" --> SYS
  SYS -- "Gera recomendações e propostas<br/>HTTPS" --> BR

  classDef default fill:#ffffff,stroke:#000000,color:#000000;
  classDef sistema fill:#ffffff,stroke:#000000,stroke-width:3px,color:#000000;
  classDef externo fill:#ffffff,stroke:#000000,stroke-dasharray:5 5,color:#000000;
```

| Elemento | Papel |
|---|---|
| Editor / Autor | Solicita a publicação (e-book, impresso ou híbrido) e aprova a proposta de diagramação da IA. |
| Leitor / Cliente | Usa a loja: catálogo, recomendações e compra. |
| CMS de autoria | Origem do conteúdo e dos metadados aprovados. |
| CMS da loja digital | Vitrine e venda; recebe a ficha do livro e o arquivo do e-book. |
| Mainframe de impressão | Gráfica própria legada; recebe ordens em XML pelo gateway. |
| Gráficas parceiras | Gráficas externas; trocam arquivos EDI por SFTP. |
| Planilhas Excel | Dados legados de preço, estoque, direitos e contratos. |
| Amazon Bedrock | Modelos de linguagem e de embeddings usados pelo agente de IA ([ADR 010](../../adrs/010-componente-ia-native.md)). |
