// Fitness functions de arquitetura (ADR 003, 008 e 010), sem dependências externas.
// No pipeline, as mesmas regras também rodam com dependency-cruiser (.dependency-cruiser.cjs).
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';

const RAIZ = join(__dirname, '..', '..');
const SRC = join(RAIZ, 'src');

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? arquivos(p) : p.endsWith('.ts') ? [p] : [];
  });
}

// Lista "arquivo -> pacote importado" para imports relativos
function importsDe(arquivo: string): string[] {
  const codigo = readFileSync(arquivo, 'utf8');
  return [...codigo.matchAll(/from\s+'(\.[^']+)'/g)].map((m) =>
    relative(SRC, resolve(dirname(arquivo), m[1])).replace(/\\/g, '/'),
  );
}

function verificar(origem: string, proibidos: string[]): string[] {
  const violacoes: string[] = [];
  for (const f of arquivos(join(SRC, origem))) {
    for (const alvo of importsDe(f)) {
      if (proibidos.some((p) => alvo.startsWith(p))) violacoes.push(`${relative(SRC, f)} -> ${alvo}`);
    }
  }
  return violacoes;
}

test('Regra 1: regras-de-negocio não importa nenhum outro pacote (A = 1, D = 0)', () => {
  assert.deepEqual(verificar('backend/regras-de-negocio', ['backend/aplicacao', 'api-rest', 'integracao', 'ia', 'main']), []);
});

test('Regra 2: aplicacao só depende do núcleo', () => {
  assert.deepEqual(verificar('backend/aplicacao', ['api-rest', 'integracao', 'ia', 'main']), []);
});

test('Regra 3: integracao (ACL) não importa aplicacao, api-rest nem ia', () => {
  assert.deepEqual(verificar('integracao', ['backend/aplicacao', 'api-rest', 'ia', 'main']), []);
});

test('Regra 4: o módulo de IA não conhece o backend nem a integração', () => {
  assert.deepEqual(verificar('ia', ['backend', 'integracao', 'api-rest', 'main']), []);
});

test('Regra 5: api-rest não importa a camada de integração', () => {
  assert.deepEqual(verificar('api-rest', ['integracao', 'backend/aplicacao', 'main']), []);
});

test('Regra 6: termos de XML/EDI/SFTP só aparecem dentro da integração (ACL)', () => {
  const fora = arquivos(SRC).filter((f) => !f.includes(`${join('src', 'integracao')}`) && !f.endsWith('main.ts'));
  const vazamentos = fora.filter((f) => /<\?xml|UNH\+|ClienteSftp/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(vazamentos.map((f) => relative(SRC, f)), []);
});
