// Adaptador de saída da Mensageria: Amazon SNS (ADR 007) com roteamento por conteúdo (ADR 009).
// ClienteSns tem o mesmo formato da chamada Publish do AWS SDK; o composition root injeta o cliente real.
import type { Livro, SolicitacaoImpressao } from '../../backend/regras-de-negocio/modelo';
import type { PublicadorEventos } from '../../backend/regras-de-negocio/portas';
import { rotearPublicacao } from './roteador-publicacao';

export interface ClienteSns {
  publish(params: {
    TopicArn: string;
    Message: string;
    MessageAttributes: Record<string, { DataType: string; StringValue: string }>;
  }): Promise<unknown>;
}

export class SnsPublicadorEventos implements PublicadorEventos {
  constructor(private readonly sns: ClienteSns, private readonly topicArn: string) {}

  async publicar(tipo: 'livro.publicado', livro: Livro, impressao?: SolicitacaoImpressao): Promise<void> {
    const canais = rotearPublicacao(livro);
    await this.sns.publish({
      TopicArn: this.topicArn,
      Message: JSON.stringify({ tipo, livro, impressao }),
      MessageAttributes: {
        tipo: { DataType: 'String', StringValue: tipo },
        canais: { DataType: 'String.Array', StringValue: JSON.stringify(canais) },
      },
    });
  }
}
