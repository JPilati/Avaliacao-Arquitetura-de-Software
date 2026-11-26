// ACL — Adapter (GoF) para o mainframe de impressão, que fala XML pelo gateway (ADR 008).
// Traduz a linguagem ubíqua (SolicitacaoImpressao) para o "job" do legado e a resposta de volta.
import type { SolicitacaoImpressao } from '../../backend/regras-de-negocio/modelo';
import type { ImpressoraGateway } from '../../backend/regras-de-negocio/portas';
import { codigoPapel, codigoAcabamento } from './tabela-codigos-legado';

export interface ClienteHttp {
  post(url: string, corpo: string, cabecalhos: Record<string, string>): Promise<string>;
}

export class RespostaLegadoInvalidaError extends Error {}

export class MainframeXmlAdapter implements ImpressoraGateway {
  constructor(private readonly baseUrl: string, private readonly http: ClienteHttp) {}

  async solicitarImpressao(s: SolicitacaoImpressao): Promise<string> {
    const xml = MainframeXmlAdapter.paraXml(s);
    const resposta = await this.http.post(`${this.baseUrl}/jobs`, xml, {
      'Content-Type': 'application/xml',
    });
    return MainframeXmlAdapter.lerIdJob(resposta);
  }

  static paraXml(s: SolicitacaoImpressao): string {
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<JOB_IMPRESSAO>',
      `  <ISBN>${s.isbn}</ISBN>`,
      `  <QTD>${s.tiragem}</QTD>`,
      `  <PAPEL>${codigoPapel[s.formatoPapel]}</PAPEL>`,
      `  <ACAB>${codigoAcabamento[s.acabamento]}</ACAB>`,
      '</JOB_IMPRESSAO>',
    ].join('\n');
  }

  static lerIdJob(xml: string): string {
    const encontrado = /<ID_JOB>([^<]+)<\/ID_JOB>/.exec(xml);
    if (!encontrado) throw new RespostaLegadoInvalidaError('Resposta do mainframe sem ID_JOB.');
    return encontrado[1].trim();
  }
}
