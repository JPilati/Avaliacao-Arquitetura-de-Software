// Strategy de fallback: mais vendidos da categoria, sem IA (ADR 010).
import type { CatalogoVendas } from '../portas';
import type { EstrategiaRecomendacao, PedidoRecomendacao, Recomendacao } from './estrategia-recomendacao';

export class RecomendacaoPorRegras implements EstrategiaRecomendacao {
  constructor(private readonly catalogo: CatalogoVendas) {}

  async recomendar(pedido: PedidoRecomendacao): Promise<Recomendacao> {
    const maisVendidos = await this.catalogo.maisVendidosDaCategoria(pedido.categoriaPreferida, 10);
    const isbns = maisVendidos.filter((i) => !pedido.historicoIsbns.includes(i)).slice(0, 5);
    return { isbns, justificativa: 'Mais vendidos da categoria.', origem: 'REGRAS' };
  }
}
