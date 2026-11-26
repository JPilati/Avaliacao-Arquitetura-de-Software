// Contexto da Strategy: usa a IA com timeout de 2 s e troca para as regras em qualquer falha (ADR 010).
// O leitor nunca vê erro (cenário de Disponibilidade da matriz QAW).
import type { EstrategiaRecomendacao, PedidoRecomendacao, Recomendacao } from './estrategia-recomendacao';

export class RecomendadorLivros {
  constructor(
    private readonly principal: EstrategiaRecomendacao,
    private readonly fallback: EstrategiaRecomendacao,
    private readonly timeoutMs = 2_000,
  ) {}

  async recomendar(pedido: PedidoRecomendacao): Promise<Recomendacao> {
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    const limite = new Promise<never>((_, rejeitar) => {
      temporizador = setTimeout(() => rejeitar(new Error('timeout da IA')), this.timeoutMs);
    });
    try {
      return await Promise.race([this.principal.recomendar(pedido), limite]);
    } catch {
      return this.fallback.recomendar(pedido);
    } finally {
      clearTimeout(temporizador);
    }
  }
}
