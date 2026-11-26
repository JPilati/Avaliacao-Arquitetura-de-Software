// Caso de uso da publicação híbrida. Depende só de contratos (ADR 003).
// Em produção, o evento é gravado na tabela outbox na mesma transação do livro (ADR 007);
// aqui o PublicadorEventos representa essa saída.
import type { Livro, SolicitacaoImpressao } from '../regras-de-negocio/modelo';
import type { PublicadorEventos, PublicarLivroUseCase } from '../regras-de-negocio/portas';

export class RegraDePublicacaoVioladaError extends Error {}

export class PublicarLivro implements PublicarLivroUseCase {
  constructor(private readonly eventos: PublicadorEventos) {}

  async publicar(livro: Livro, impressao?: Omit<SolicitacaoImpressao, 'isbn'>): Promise<void> {
    if (livro.formatos.length === 0) {
      throw new RegraDePublicacaoVioladaError('O livro precisa de ao menos um formato.');
    }
    const impresso = livro.formatos.includes('IMPRESSO');
    if (impresso && !impressao) {
      // Mesma regra do contrato: IMPRESSO sem dados de impressão responde 422 (ADR 005)
      throw new RegraDePublicacaoVioladaError('Livro impresso exige dados de impressão.');
    }
    const solicitacao = impresso && impressao ? { isbn: livro.isbn, ...impressao } : undefined;
    await this.eventos.publicar('livro.publicado', livro, solicitacao);
  }
}
