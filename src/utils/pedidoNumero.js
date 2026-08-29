// Como o pedido aparece pra uma PESSOA.
//
// O `id` do pedido é um uuid — "65fea81c-b4c5-455f-ba5f-750516e574ff". As
// telas mostravam os 8 primeiros caracteres ("#65FEA81C"), o que ninguém
// consegue ditar no telefone, o suporte não anota sem errar e o parceiro não
// usa pra conversar com a loja. Agora o pedido tem `numero`: 1000, 1001, 1002.
//
// O uuid continua sendo a chave em rota, em banco e em ligação entre tabelas.
// O que mudou é só o que o olho vê.
//
// A RESERVA IMPORTA: se `numero` não vier no payload (rota antiga, cache
// velho, pedido de antes da migração), volta pro pedaço do uuid em vez de
// mostrar "#undefined" — que é o pior dos dois mundos, porque parece defeito
// e não ajuda a identificar nada.
export function numeroPedido(pedido) {
  const n = pedido?.numero ?? pedido?.order_number;
  if (n !== null && n !== undefined && n !== '') return `#${n}`;
  const id = pedido?.id ?? pedido;
  return id ? `#${String(id).substring(0, 8).toUpperCase()}` : '#—';
}
