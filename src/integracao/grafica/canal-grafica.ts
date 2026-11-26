// Factory Method (GoF) — ADR 008.
// A classe criadora define o método-fábrica criarAdapter(); cada subclasse cria o adapter da sua gráfica.
// A operação gateway() é igual para todas: sempre envolve o adapter na resiliência da ADR 006.
import type { ImpressoraGateway } from '../../backend/regras-de-negocio/portas';
import { Disjuntor } from './disjuntor';
import { ClienteSftp, GraficaEdiAdapter } from './grafica-edi-adapter';
import { ImpressoraGatewayResiliente } from './impressora-gateway-resiliente';
import { ClienteHttp, MainframeXmlAdapter } from './mainframe-xml-adapter';

export abstract class CanalGrafica {
  protected abstract criarAdapter(): ImpressoraGateway; // método-fábrica

  gateway(): ImpressoraGateway {
    return new ImpressoraGatewayResiliente(this.criarAdapter(), new Disjuntor());
  }
}

export class CanalMainframeXml extends CanalGrafica {
  constructor(private readonly baseUrl: string, private readonly http: ClienteHttp) {
    super();
  }
  protected criarAdapter(): ImpressoraGateway {
    return new MainframeXmlAdapter(this.baseUrl, this.http);
  }
}

export class CanalGraficaEdi extends CanalGrafica {
  constructor(private readonly sftp: ClienteSftp, private readonly gerarReferencia: () => string) {
    super();
  }
  protected criarAdapter(): ImpressoraGateway {
    return new GraficaEdiAdapter(this.sftp, this.gerarReferencia);
  }
}
