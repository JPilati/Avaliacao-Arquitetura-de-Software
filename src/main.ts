// Composition root: único arquivo autorizado a importar classes concretas de todos os módulos (ADR 003).
// Os clientes de infraestrutura (AWS SDK, HTTP, SFTP, Bedrock, pgvector) são injetados de fora.
import { PublicacaoController, RecomendacaoController } from './api-rest/controllers';
import { PublicarLivro } from './backend/aplicacao/publicar-livro';
import type { ImpressoraGateway } from './backend/regras-de-negocio/portas';
import { CanalGrafica, CanalGraficaEdi, CanalMainframeXml } from './integracao/grafica/canal-grafica';
import type { ClienteSftp } from './integracao/grafica/grafica-edi-adapter';
import type { ClienteHttp } from './integracao/grafica/mainframe-xml-adapter';
import { ClienteSns, SnsPublicadorEventos } from './integracao/mensageria/sns-publicador-eventos';
import type { CatalogoVendas, IndiceVetorialGateway, ModeloLinguagemGateway } from './ia/portas';
import { RecomendacaoPorIa } from './ia/recomendacao/recomendacao-por-ia';
import { RecomendacaoPorRegras } from './ia/recomendacao/recomendacao-por-regras';
import { RecomendadorLivros } from './ia/recomendacao/recomendador-livros';

export interface Infraestrutura {
  sns: ClienteSns;
  topicoLivroPublicado: string;
  grafica: { tipo: 'MAINFRAME_XML'; baseUrl: string; http: ClienteHttp } | { tipo: 'EDI_SFTP'; sftp: ClienteSftp };
  modelo: ModeloLinguagemGateway;
  indiceVetorial: IndiceVetorialGateway;
  catalogo: CatalogoVendas;
}

export function montarAplicacao(infra: Infraestrutura) {
  const publicarLivro = new PublicarLivro(new SnsPublicadorEventos(infra.sns, infra.topicoLivroPublicado));

  // Factory Method: o canal certo para a gráfica configurada (ADR 008)
  const canal: CanalGrafica =
    infra.grafica.tipo === 'MAINFRAME_XML'
      ? new CanalMainframeXml(infra.grafica.baseUrl, infra.grafica.http)
      : new CanalGraficaEdi(infra.grafica.sftp, () => `ADT${Date.now()}`);
  const impressora: ImpressoraGateway = canal.gateway(); // usado pelo consumidor da fila impressao-solicitar

  const recomendador = new RecomendadorLivros(
    new RecomendacaoPorIa(infra.indiceVetorial, infra.modelo),
    new RecomendacaoPorRegras(infra.catalogo),
  );

  return {
    publicacaoController: new PublicacaoController(publicarLivro),
    recomendacaoController: new RecomendacaoController(recomendador),
    impressora,
  };
}
