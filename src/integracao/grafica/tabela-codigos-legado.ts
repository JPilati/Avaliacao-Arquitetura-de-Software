// Tabela de tradução entre a linguagem ubíqua e os códigos das gráficas legadas (ACL, ADR 008).
import type { Acabamento, FormatoPapel } from '../../backend/regras-de-negocio/modelo';

export const codigoPapel: Record<FormatoPapel, string> = {
  '14x21': 'P1421',
  '16x23': 'P1623',
  A5: 'PA5',
};

export const codigoAcabamento: Record<Acabamento, string> = {
  BROCHURA: 'BR',
  CAPA_DURA: 'CD',
};
