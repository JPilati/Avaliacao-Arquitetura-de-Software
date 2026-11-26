// Bounded Context: Publicação Editorial (Core Domain) — ADR 008
// Contratos de dados gerados do schema Livro do OpenAPI (ADR 005).
// Este pacote só contém contratos (A = 1) e não importa nenhum outro pacote (ADR 003).

export type Formato = 'EBOOK' | 'IMPRESSO';
export type FormatoPapel = '14x21' | '16x23' | 'A5';
export type Acabamento = 'BROCHURA' | 'CAPA_DURA';

export interface Autor {
  nome: string;
  papel?: 'AUTOR' | 'COAUTOR' | 'ORGANIZADOR' | 'TRADUTOR';
}

export interface Livro {
  isbn: string;
  titulo: string;
  autores: Autor[];
  idioma: string;
  preco: { valorEmCentavos: number; moeda: 'BRL' };
  formatos: Formato[];
  arquivoConteudoUrl: string;
  sinopse?: string;
  numeroPaginas?: number;
}

export interface SolicitacaoImpressao {
  isbn: string;
  tiragem: number;
  formatoPapel: FormatoPapel;
  acabamento: Acabamento;
}
