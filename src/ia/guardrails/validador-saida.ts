// Guardrail: a saída do modelo só é aceita se for JSON no formato esperado (ADR 010).
// Os enums da diagramação são os mesmos do contrato OpenAPI (ADR 005).

export interface SaidaRecomendacao {
  isbns: string[];
  justificativa: string;
}

export interface PropostaDiagramacao {
  formatoPapel: '14x21' | '16x23' | 'A5';
  acabamento: 'BROCHURA' | 'CAPA_DURA';
  fonte: string;
  corpoPt: number;
  margensMm: number;
  entrelinha: number;
}

export class SaidaInvalidaError extends Error {}

function lerJson(texto: string): Record<string, unknown> {
  try {
    const valor: unknown = JSON.parse(texto);
    if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) throw new Error();
    return valor as Record<string, unknown>;
  } catch {
    throw new SaidaInvalidaError('A resposta do modelo não é um objeto JSON.');
  }
}

export function validarRecomendacao(texto: string): SaidaRecomendacao {
  const o = lerJson(texto);
  const isbns = o.isbns;
  if (!Array.isArray(isbns) || isbns.length === 0 || isbns.length > 5) {
    throw new SaidaInvalidaError('isbns deve ter de 1 a 5 itens.');
  }
  if (!isbns.every((i) => typeof i === 'string' && /^97[89][0-9]{10}$/.test(i))) {
    throw new SaidaInvalidaError('isbns deve conter ISBN-13 válidos.');
  }
  if (typeof o.justificativa !== 'string' || o.justificativa.length > 300) {
    throw new SaidaInvalidaError('justificativa ausente ou longa demais.');
  }
  return { isbns: isbns as string[], justificativa: o.justificativa };
}

export function validarDiagramacao(texto: string): PropostaDiagramacao {
  const o = lerJson(texto);
  const papeis = ['14x21', '16x23', 'A5'];
  const acabamentos = ['BROCHURA', 'CAPA_DURA'];
  const ok =
    papeis.includes(o.formatoPapel as string) &&
    acabamentos.includes(o.acabamento as string) &&
    typeof o.fonte === 'string' &&
    typeof o.corpoPt === 'number' && o.corpoPt >= 9 && o.corpoPt <= 14 &&
    typeof o.margensMm === 'number' && o.margensMm >= 10 && o.margensMm <= 30 &&
    typeof o.entrelinha === 'number' && o.entrelinha >= 1 && o.entrelinha <= 2;
  if (!ok) throw new SaidaInvalidaError('Proposta de diagramação fora do schema.');
  return o as unknown as PropostaDiagramacao;
}
