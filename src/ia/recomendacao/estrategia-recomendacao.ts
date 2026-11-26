// Strategy (GoF): formas intercambiáveis de recomendar livros (ADR 010).
export interface PedidoRecomendacao {
  historicoIsbns: string[]; // só ISBNs, nunca dados pessoais
  categoriaPreferida?: string;
}

export interface Recomendacao {
  isbns: string[];
  justificativa: string;
  origem: 'IA' | 'REGRAS';
}

export interface EstrategiaRecomendacao {
  recomendar(pedido: PedidoRecomendacao): Promise<Recomendacao>;
}
