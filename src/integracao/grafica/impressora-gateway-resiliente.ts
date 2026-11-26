// Decorator (GoF) que acrescenta timeout e circuit breaker a qualquer adapter de gráfica (ADR 006).
// O retry em dois níveis e o fallback para a espera de impressão ficam no consumidor da fila SQS (ADR 007).
import type { SolicitacaoImpressao } from '../../backend/regras-de-negocio/modelo';
import type { ImpressoraGateway } from '../../backend/regras-de-negocio/portas';
import { Disjuntor } from './disjuntor';

export class TimeoutError extends Error {}

export function comTimeout<T>(promessa: Promise<T>, ms: number): Promise<T> {
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rejeitar) => {
    temporizador = setTimeout(() => rejeitar(new TimeoutError(`Sem resposta em ${ms} ms`)), ms);
  });
  return Promise.race([promessa, limite]).finally(() => clearTimeout(temporizador));
}

export class ImpressoraGatewayResiliente implements ImpressoraGateway {
  constructor(
    private readonly interno: ImpressoraGateway,
    private readonly disjuntor: Disjuntor,
    private readonly timeoutMs = 5_000, // ADR 006: 5 s de resposta
  ) {}

  solicitarImpressao(s: SolicitacaoImpressao): Promise<string> {
    return this.disjuntor.chamar(() => comTimeout(this.interno.solicitarImpressao(s), this.timeoutMs));
  }
}
