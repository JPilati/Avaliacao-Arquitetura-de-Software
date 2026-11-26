// Teste do Content-Based Router (ADR 009).
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CANAIS, rotearPublicacao } from '../src/integracao/mensageria/roteador-publicacao';
import { SnsPublicadorEventos } from '../src/integracao/mensageria/sns-publicador-eventos';
import type { Livro } from '../src/backend/regras-de-negocio/modelo';

test('e-book puro vai para loja, ebook e IA, nunca para a gráfica', () => {
  assert.deepEqual(rotearPublicacao({ formatos: ['EBOOK'] }), ['LOJA', 'EBOOK', 'IA']);
});

test('livro só impresso vai para loja, impressão e IA', () => {
  assert.deepEqual(rotearPublicacao({ formatos: ['IMPRESSO'] }), ['LOJA', 'IMPRESSAO', 'IA']);
});

test('livro híbrido vai para todos os canais', () => {
  assert.deepEqual(rotearPublicacao({ formatos: ['EBOOK', 'IMPRESSO'] }), ['LOJA', 'EBOOK', 'IMPRESSAO', 'IA']);
});

test('o publicador SNS grava os canais no atributo String.Array', async () => {
  const enviados: any[] = [];
  const pub = new SnsPublicadorEventos({ publish: async (p) => { enviados.push(p); } }, 'arn:topico');
  const livro: Livro = {
    isbn: '9788500000001', titulo: 'Dom Casmurro', autores: [{ nome: 'Machado de Assis' }], idioma: 'pt-BR',
    preco: { valorEmCentavos: 4990, moeda: 'BRL' }, formatos: ['EBOOK'], arquivoConteudoUrl: 'https://cms/x.epub',
  };
  await pub.publicar('livro.publicado', livro);
  assert.equal(enviados[0].MessageAttributes.canais.DataType, 'String.Array');
  assert.deepEqual(JSON.parse(enviados[0].MessageAttributes.canais.StringValue), ['LOJA', 'EBOOK', 'IA']);
});

test('fitness function: canais do código e filter policies do SNS são os mesmos', () => {
  const politicas = JSON.parse(readFileSync(join(__dirname, '..', '..', 'infra', 'sns-filter-policies.json'), 'utf8'));
  const canaisNasPoliticas = Object.values(politicas.assinaturas).flatMap((p: any) => p.canais).sort();
  assert.deepEqual(canaisNasPoliticas, [...CANAIS].sort());
});
