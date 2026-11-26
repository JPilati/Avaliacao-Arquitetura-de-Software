// Testes dos guardrails e do fallback do agente de IA (ADR 010).
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { higienizarPii } from '../src/ia/guardrails/higienizador-pii';
import { SaidaInvalidaError, validarDiagramacao } from '../src/ia/guardrails/validador-saida';
import { RecomendacaoPorIa } from '../src/ia/recomendacao/recomendacao-por-ia';
import { RecomendacaoPorRegras } from '../src/ia/recomendacao/recomendacao-por-regras';
import { RecomendadorLivros } from '../src/ia/recomendacao/recomendador-livros';

const indice = {
  buscarCandidatos: async () => [
    { isbn: '9788500000002', titulo: 'Memórias Póstumas', categoria: 'Clássicos' },
    { isbn: '9788500000003', titulo: 'Quincas Borba', categoria: 'Clássicos' },
  ],
};
const catalogo = { maisVendidosDaCategoria: async () => ['9788500000009', '9788500000008'] };
const pedido = { historicoIsbns: ['9788500000001'], categoriaPreferida: 'Clássicos' };

test('PII: remove e-mail, CPF e telefone antes de chamar o modelo', () => {
  const limpo = higienizarPii('Leitor ana@exemplo.com, CPF 123.456.789-09, fone (41) 99999-1234');
  assert.ok(!limpo.includes('ana@exemplo.com'));
  assert.ok(!limpo.includes('123.456.789-09'));
  assert.ok(!limpo.includes('99999-1234'));
});

test('Aterramento: ISBN fora dos candidatos é descartado', async () => {
  const modelo = { gerar: async () => '{"isbns": ["9788500000002", "9780000000000"], "justificativa": "Mesmo autor."}' };
  const r = await new RecomendacaoPorIa(indice, modelo).recomendar(pedido);
  assert.deepEqual(r.isbns, ['9788500000002']);
  assert.equal(r.origem, 'IA');
});

test('Fallback: saída fora do schema cai na recomendação por regras', async () => {
  const modelo = { gerar: async () => 'claro! aqui estão meus livros favoritos' };
  const r = await new RecomendadorLivros(new RecomendacaoPorIa(indice, modelo), new RecomendacaoPorRegras(catalogo)).recomendar(pedido);
  assert.equal(r.origem, 'REGRAS');
});

test('Fallback: modelo lento além do timeout cai na recomendação por regras', async () => {
  const lento = { gerar: () => new Promise<string>((ok) => setTimeout(() => ok('{}'), 200)) };
  const r = await new RecomendadorLivros(new RecomendacaoPorIa(indice, lento), new RecomendacaoPorRegras(catalogo), 50).recomendar(pedido);
  assert.equal(r.origem, 'REGRAS');
});

test('Diagramação: só aceita os enums do contrato OpenAPI', () => {
  const ok = validarDiagramacao('{"formatoPapel":"14x21","acabamento":"BROCHURA","fonte":"Garamond","corpoPt":11,"margensMm":20,"entrelinha":1.3}');
  assert.equal(ok.formatoPapel, '14x21');
  assert.throws(
    () => validarDiagramacao('{"formatoPapel":"A4","acabamento":"BROCHURA","fonte":"Garamond","corpoPt":11,"margensMm":20,"entrelinha":1.3}'),
    SaidaInvalidaError,
  );
});
