// Portas do núcleo hexagonal (ADR 003 e ADR 004).
import type { Livro, SolicitacaoImpressao } from './modelo';

// Porta de entrada
export interface PublicarLivroUseCase {
  publicar(livro: Livro, impressao?: Omit<SolicitacaoImpressao, 'isbn'>): Promise<void>;
}

// Porta de saída para a Produção Gráfica — implementada pela ACL (ADR 008)
export interface ImpressoraGateway {
  solicitarImpressao(s: SolicitacaoImpressao): Promise<string>; // id da solicitação no legado
}

// Porta de saída para a Mensageria — implementada pelo SnsPublicadorEventos (ADR 007 e ADR 009)
export interface PublicadorEventos {
  publicar(tipo: 'livro.publicado', livro: Livro, impressao?: SolicitacaoImpressao): Promise<void>;
}
