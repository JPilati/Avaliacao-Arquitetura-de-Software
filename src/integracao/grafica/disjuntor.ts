// Circuit Breaker com padrão State (APS 2). Versão didática da ADR 006:
// em produção a equipe usa a biblioteca opossum, com janela rolante de 60 s.
export class CircuitoAbertoError extends Error {}

interface EstadoDisjuntor {
  chamar<T>(d: Disjuntor, acao: () => Promise<T>): Promise<T>;
}

class Fechado implements EstadoDisjuntor {
  async chamar<T>(d: Disjuntor, acao: () => Promise<T>): Promise<T> {
    try {
      const r = await acao();
      d.registrarSucesso();
      return r;
    } catch (e) {
      d.registrarFalha();
      throw e;
    }
  }
}

class Aberto implements EstadoDisjuntor {
  constructor(private readonly abertoEm: number) {}
  async chamar<T>(d: Disjuntor, acao: () => Promise<T>): Promise<T> {
    if (d.agora() - this.abertoEm < d.config.tempoAbertoMs) {
      throw new CircuitoAbertoError('Circuito aberto: aciona o fallback.');
    }
    d.mudarPara(new MeioAberto());
    return d.chamar(acao);
  }
}

class MeioAberto implements EstadoDisjuntor {
  async chamar<T>(d: Disjuntor, acao: () => Promise<T>): Promise<T> {
    try {
      const r = await acao(); // uma única chamada de teste
      d.fechar();
      return r;
    } catch (e) {
      d.abrir();
      throw e;
    }
  }
}

export interface ConfigDisjuntor {
  volumeMinimo: number; // ADR 006: 10 chamadas
  limiteFalhas: number; // ADR 006: 50% (0.5)
  tempoAbertoMs: number; // ADR 006: 30 s
}

export class Disjuntor {
  private estado: EstadoDisjuntor = new Fechado();
  private chamadas = 0;
  private falhas = 0;

  constructor(
    readonly config: ConfigDisjuntor = { volumeMinimo: 10, limiteFalhas: 0.5, tempoAbertoMs: 30_000 },
    readonly agora: () => number = Date.now,
  ) {}

  chamar<T>(acao: () => Promise<T>): Promise<T> {
    return this.estado.chamar(this, acao);
  }

  registrarSucesso(): void {
    this.chamadas++;
  }

  registrarFalha(): void {
    this.chamadas++;
    this.falhas++;
    if (this.chamadas >= this.config.volumeMinimo && this.falhas / this.chamadas >= this.config.limiteFalhas) {
      this.abrir();
    }
  }

  abrir(): void {
    this.mudarPara(new Aberto(this.agora()));
  }

  fechar(): void {
    this.chamadas = 0;
    this.falhas = 0;
    this.mudarPara(new Fechado());
  }

  mudarPara(e: EstadoDisjuntor): void {
    this.estado = e;
  }

  get aberto(): boolean {
    return this.estado instanceof Aberto;
  }
}
