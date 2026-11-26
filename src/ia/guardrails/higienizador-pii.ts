// Guardrail: remove dados pessoais antes de qualquer chamada ao modelo (ADR 010).
const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
const CPF = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const TELEFONE = /(\+55\s?)?\(?\d{2}\)?\s?9?\d{4}-?\d{4}\b/g;

export function higienizarPii(texto: string): string {
  return texto
    .replace(EMAIL, '[EMAIL]')
    .replace(CPF, '[CPF]')
    .replace(TELEFONE, '[TELEFONE]');
}
