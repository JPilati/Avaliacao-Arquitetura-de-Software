// Strategy principal: RAG + modelo Tier 1, com guardrails (ADR 010).
import { higienizarPii } from '../guardrails/higienizador-pii';
import { SaidaInvalidaError, validarRecomendacao } from '../guardrails/validador-saida';
import type { IndiceVetorialGateway, ModeloLinguagemGateway } from '../portas';
import type { EstrategiaRecomendacao, PedidoRecomendacao, Recomendacao } from './estrategia-recomendacao';

export class RecomendacaoPorIa implements EstrategiaRecomendacao {
  constructor(
    private readonly indice: IndiceVetorialGateway,
    private readonly modelo: ModeloLinguagemGateway,
  ) {}

  async recomendar(pedido: PedidoRecomendacao): Promise<Recomendacao> {
    // 1. Recuperação (RAG): candidatos reais do catálogo
    const candidatos = await this.indice.buscarCandidatos(pedido.historicoIsbns, 20);
    if (candidatos.length === 0) throw new SaidaInvalidaError('Nenhum candidato no índice.');

    // 2. Geração com prompt higienizado e lista fechada de candidatos
    const prompt = higienizarPii(
      [
        'Escolha até 5 livros SOMENTE da lista de candidatos e justifique em uma frase.',
        'Responda apenas JSON: {"isbns": [...], "justificativa": "..."}',
        `Histórico do leitor (ISBNs): ${pedido.historicoIsbns.join(', ')}`,
        `Candidatos: ${JSON.stringify(candidatos)}`,
      ].join('\n'),
    );
    const resposta = await this.modelo.gerar('TIER1', prompt, 300);

    // 3. Guardrails: schema + aterramento no catálogo (descarta ISBN inventado)
    const saida = validarRecomendacao(resposta);
    const permitidos = new Set(candidatos.map((c) => c.isbn));
    const isbns = saida.isbns.filter((i) => permitidos.has(i));
    if (isbns.length === 0) throw new SaidaInvalidaError('Modelo recomendou só livros fora do catálogo.');

    return { isbns, justificativa: saida.justificativa, origem: 'IA' };
  }
}
