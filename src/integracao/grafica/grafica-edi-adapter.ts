// ACL — Adapter (GoF) para gráficas parceiras que trocam arquivos EDI por SFTP (ADR 008).
// Formato simplificado no estilo EDIFACT (ORDERS); cada gráfica tem arquivos de exemplo nos testes.
import type { SolicitacaoImpressao } from '../../backend/regras-de-negocio/modelo';
import type { ImpressoraGateway } from '../../backend/regras-de-negocio/portas';
import { codigoPapel, codigoAcabamento } from './tabela-codigos-legado';

export interface ClienteSftp {
  enviarArquivo(caminho: string, conteudo: string): Promise<void>;
}

export class GraficaEdiAdapter implements ImpressoraGateway {
  constructor(
    private readonly sftp: ClienteSftp,
    private readonly gerarReferencia: () => string,
  ) {}

  async solicitarImpressao(s: SolicitacaoImpressao): Promise<string> {
    const referencia = this.gerarReferencia();
    await this.sftp.enviarArquivo(`/entrada/${referencia}.edi`, GraficaEdiAdapter.paraEdi(s, referencia));
    return referencia; // a gráfica devolve o status depois, em arquivo de retorno
  }

  static paraEdi(s: SolicitacaoImpressao, referencia: string): string {
    return [
      `UNH+${referencia}+ORDERS:D:96A:UN'`,
      `BGM+220+${referencia}'`,
      `LIN+1++${s.isbn}:EN'`,
      `QTY+21:${s.tiragem}'`,
      `IMD+F+PAP+:::${codigoPapel[s.formatoPapel]}'`,
      `IMD+F+ACB+:::${codigoAcabamento[s.acabamento]}'`,
      `UNT+6+${referencia}'`,
    ].join('\n');
  }
}
