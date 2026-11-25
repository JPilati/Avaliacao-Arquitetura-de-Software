// Content-Based Router (EIP) — ADR 009.
// A regra "para onde vai cada livro" fica só aqui; o SNS entrega pelas filter policies do atributo `canais`.
import type { Livro } from '../../backend/regras-de-negocio/modelo';

export const CANAIS = ['LOJA', 'EBOOK', 'IMPRESSAO', 'IA'] as const;
export type Canal = (typeof CANAIS)[number];

export function rotearPublicacao(livro: Pick<Livro, 'formatos'>): Canal[] {
  const canais: Canal[] = ['LOJA'];
  if (livro.formatos.includes('EBOOK')) canais.push('EBOOK');
  if (livro.formatos.includes('IMPRESSO')) canais.push('IMPRESSAO');
  canais.push('IA');
  return canais;
}
