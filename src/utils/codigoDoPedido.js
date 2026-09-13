// src/utils/codigoDoPedido.js
//
// Tamanho do código de retirada / entrega / devolução. UM lugar.
//
// ⚠️ ACEITA 4 A 6, e isso NÃO é frouxidão — é convivência.
//
// Em 13/09/2026 o código passou de 6 para 4 dígitos (mais fácil de falar no
// telefone, digitar de luva e ditar na porta do cliente). Mas os pedidos que
// JÁ ESTAVAM NA RUA naquele momento continuam com 6, e vão continuar até
// serem entregues.
//
// Exigir exatamente 4 quebraria esses pedidos; exigir exatamente 6 quebraria
// todos os novos. Quem valida de verdade é o servidor, comparando com o
// código gravado — aqui o trabalho é só não impedir a pessoa de enviar.
//
// O teto continua 6 pra o campo não cortar um código antigo pela metade.
export const CODIGO_MIN = 4;
export const CODIGO_MAX = 6;

/** Só os dígitos, cortado no tamanho máximo. Use no onChange do campo. */
export function limparCodigo(valor) {
  return String(valor || '').replace(/\D/g, '').slice(0, CODIGO_MAX);
}

/** Dá pra enviar? (o servidor é quem diz se está certo) */
export function codigoCompleto(valor) {
  const n = limparCodigo(valor).length;
  return n >= CODIGO_MIN && n <= CODIGO_MAX;
}

/** Texto do aviso quando ainda não dá pra enviar. */
export const AVISO_CODIGO = 'Digite o código do pedido (4 a 6 números).';
