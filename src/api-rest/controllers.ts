// Adaptadores de entrada HTTP (ApiRest). Dependem só de portas (ADR 003).
// O Express e o express-openapi-validator ficam no servidor; aqui está só a tradução HTTP ⇄ caso de uso.
import type { Livro, SolicitacaoImpressao } from '../backend/regras-de-negocio/modelo';
import type { PublicarLivroUseCase } from '../backend/regras-de-negocio/portas';
import type { PedidoRecomendacao, Recomendacao } from '../ia/recomendacao/estrategia-recomendacao';

export interface RespostaHttp {
  status: number;
  corpo: unknown;
}

export class PublicacaoController {
  constructor(private readonly publicarLivro: PublicarLivroUseCase) {}

  // POST /v1/publicacoes — responde 202: loja e gráfica seguem de forma assíncrona (ADR 005)
  async post(corpo: { livro: Livro; impressao?: Omit<SolicitacaoImpressao, 'isbn'> }): Promise<RespostaHttp> {
    try {
      await this.publicarLivro.publicar(corpo.livro, corpo.impressao);
      return { status: 202, corpo: { isbn: corpo.livro.isbn, status: 'RECEBIDA' } };
    } catch (e) {
      return { status: 422, corpo: { title: 'Regra de publicação violada', detail: (e as Error).message } };
    }
  }
}

export class RecomendacaoController {
  constructor(private readonly recomendador: { recomendar(p: PedidoRecomendacao): Promise<Recomendacao> }) {}

  // GET /v1/recomendacoes — fluxo F13
  async get(pedido: PedidoRecomendacao): Promise<RespostaHttp> {
    return { status: 200, corpo: await this.recomendador.recomendar(pedido) };
  }
}
