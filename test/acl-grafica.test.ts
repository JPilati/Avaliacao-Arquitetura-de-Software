// Testes de contrato da ACL e do Factory Method (ADR 008), e do Circuit Breaker (ADR 006).
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { SolicitacaoImpressao } from '../src/backend/regras-de-negocio/modelo';
import { CanalGraficaEdi, CanalMainframeXml } from '../src/integracao/grafica/canal-grafica';
import { CircuitoAbertoError, Disjuntor } from '../src/integracao/grafica/disjuntor';
import { GraficaEdiAdapter } from '../src/integracao/grafica/grafica-edi-adapter';
import { ImpressoraGatewayResiliente } from '../src/integracao/grafica/impressora-gateway-resiliente';
import { MainframeXmlAdapter } from '../src/integracao/grafica/mainframe-xml-adapter';

const pedido: SolicitacaoImpressao = { isbn: '9788500000001', tiragem: 500, formatoPapel: '14x21', acabamento: 'BROCHURA' };

test('ACL XML: traduz a linguagem ubíqua para o job do mainframe', () => {
  const xml = MainframeXmlAdapter.paraXml(pedido);
  assert.match(xml, /<QTD>500<\/QTD>/);
  assert.match(xml, /<PAPEL>P1421<\/PAPEL>/);
  assert.match(xml, /<ACAB>BR<\/ACAB>/);
});

test('ACL XML: traduz a resposta do mainframe de volta para um id', async () => {
  const http = { post: async () => '<RESPOSTA><ID_JOB> J-77 </ID_JOB></RESPOSTA>' };
  assert.equal(await new MainframeXmlAdapter('https://gateway', http).solicitarImpressao(pedido), 'J-77');
});

test('ACL EDI: gera os segmentos de quantidade e papel', () => {
  const edi = GraficaEdiAdapter.paraEdi(pedido, 'ADT1');
  assert.match(edi, /QTY\+21:500'/);
  assert.match(edi, /IMD\+F\+PAP\+:::P1421'/);
});

test('Factory Method: todo canal devolve o adapter envolvido na resiliência', () => {
  const xml = new CanalMainframeXml('https://gateway', { post: async () => '' }).gateway();
  const edi = new CanalGraficaEdi({ enviarArquivo: async () => undefined }, () => 'ADT1').gateway();
  assert.ok(xml instanceof ImpressoraGatewayResiliente);
  assert.ok(edi instanceof ImpressoraGatewayResiliente);
});

test('Circuit Breaker: abre com 50% de falhas após o volume mínimo e corta as chamadas', async () => {
  let agora = 0;
  const disjuntor = new Disjuntor({ volumeMinimo: 4, limiteFalhas: 0.5, tempoAbertoMs: 30_000 }, () => agora);
  const falha = async () => { throw new Error('503'); };
  for (let i = 0; i < 4; i++) await assert.rejects(disjuntor.chamar(falha));
  assert.ok(disjuntor.aberto);
  await assert.rejects(disjuntor.chamar(async () => 'ok'), CircuitoAbertoError);
  agora = 31_000; // passou o tempo aberto: meio-aberto deixa uma chamada de teste
  assert.equal(await disjuntor.chamar(async () => 'ok'), 'ok');
  assert.ok(!disjuntor.aberto);
});
