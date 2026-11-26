// Bounded Context: Recomendação e Diagramação (ADR 010).
// O módulo de IA tem portas próprias; só src/ia/infra (adapters do Bedrock e do pgvector) conhece os SDKs.

export interface ModeloLinguagemGateway {
  // Devolve o texto gerado pelo modelo do tier indicado (nome do modelo vem da configuração).
  gerar(tier: 'TIER1' | 'TIER2', prompt: string, maxTokens: number): Promise<string>;
}

export interface Candidato {
  isbn: string;
  titulo: string;
  categoria: string;
}

export interface IndiceVetorialGateway {
  // Livros mais próximos do histórico do leitor no banco vetorial (pgvector), sem os já comprados.
  buscarCandidatos(historicoIsbns: string[], limite: number): Promise<Candidato[]>;
}

export interface CatalogoVendas {
  maisVendidosDaCategoria(categoria: string | undefined, limite: number): Promise<string[]>;
}
