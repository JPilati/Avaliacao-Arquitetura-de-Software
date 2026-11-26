// Fitness functions de dependência executadas a cada pull request (ADR 003, 005, 008 e 010).
module.exports = {
  forbidden: [
    {
      name: 'nucleo-isolado',
      comment: 'backend/regras-de-negocio só contém contratos e não importa nenhum outro pacote (ADR 003).',
      severity: 'error',
      from: { path: '^src/backend/regras-de-negocio' },
      to: { pathNot: '^src/backend/regras-de-negocio' },
    },
    {
      name: 'aplicacao-so-depende-do-nucleo',
      severity: 'error',
      from: { path: '^src/backend/aplicacao' },
      to: { path: '^src/(api-rest|integracao|ia)' },
    },
    {
      name: 'acl-nao-conhece-aplicacao',
      comment: 'A Camada Anti-Corrupção depende só das portas do núcleo (ADR 008).',
      severity: 'error',
      from: { path: '^src/integracao' },
      to: { path: '^src/(backend/aplicacao|api-rest|ia)' },
    },
    {
      name: 'ia-isolada',
      comment: 'O módulo de IA não conhece o backend nem a integração (ADR 010).',
      severity: 'error',
      from: { path: '^src/ia' },
      to: { path: '^src/(backend|integracao|api-rest)' },
    },
    {
      name: 'clientes-de-rede-so-na-integracao',
      comment: 'Só a integração (e src/ia/infra) importa SDKs de rede, AWS, SFTP e modelos (ADR 005, 007 e 010).',
      severity: 'error',
      from: { path: '^src', pathNot: '^src/(integracao|ia/infra|main\\.ts)' },
      to: { path: 'node_modules/(@aws-sdk|ssh2-sftp-client|axios|undici|pg)' },
    },
    {
      name: 'sem-ciclos',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    tsConfig: { fileName: 'tsconfig.json' },
    doNotFollow: { path: 'node_modules' },
  },
};
