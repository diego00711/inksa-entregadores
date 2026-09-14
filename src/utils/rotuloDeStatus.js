// src/utils/rotuloDeStatus.js
//
// UM lugar só com o nome de cada status de pedido, em português.
//
// ⚠️ POR QUE ISTO EXISTE: havia TRÊS mapas copiados (DeliveryCard, EarningsPage
// e DeliveryDetailModal) e os três tinham buracos DIFERENTES. Todos caíam em
// `|| status`, que não dá erro nenhum — só mostra a palavra em inglês pro
// entregador. Em 14/09/2026 a tela de Ganhos não tinha `canceled` (grafia
// americana, que ACONTECE nos dados) e nenhuma das duas listas tinha
// `awaiting_payment`.
//
// Mapa que falha calado é pior que mapa que falta: ninguém descobre por bug
// report, só por alguém olhar a tela na hora certa.
//
// Mexeu em status no backend? É AQUI que entra o nome novo. Um só.

const ROTULOS = {
  pending:              'Pendente',
  awaiting_payment:     'Aguardando pagamento',
  accepted:             'Aceito',
  preparing:            'Preparando',
  ready:                'Pronto para retirada',
  accepted_by_delivery: 'Aguardando retirada',
  picked_up:            'Retirado',
  delivering:           'Em rota',
  on_the_way:           'Em rota',
  delivered:            'Entregue',
  // As duas grafias existem na base. Faltando uma, o badge mostra inglês.
  cancelled:            'Cancelado',
  canceled:             'Cancelado',
  delivery_failed:      'Entrega não concluída',
};

// Cores padrão. Uma tela pode ter motivo pra divergir — ver CLASSES_GANHOS
// abaixo — mas o NOME nunca diverge.
const CLASSES = {
  pending:              'bg-yellow-100 text-yellow-800',
  awaiting_payment:     'bg-yellow-100 text-yellow-800',
  accepted:             'bg-blue-100 text-blue-800',
  preparing:            'bg-orange-100 text-orange-800',
  ready:                'bg-green-100 text-green-800',
  accepted_by_delivery: 'bg-pink-100 text-pink-800',
  picked_up:            'bg-pink-100 text-pink-800',
  delivering:           'bg-purple-100 text-purple-800',
  on_the_way:           'bg-purple-100 text-purple-800',
  delivered:            'bg-gray-100 text-gray-800',
  cancelled:            'bg-red-100 text-red-800',
  canceled:             'bg-red-100 text-red-800',
  delivery_failed:      'bg-red-100 text-red-800',
};

// Na tela de GANHOS a leitura é outra: ali a lista é o que ele recebeu, então
// entregue é verde (ganhou) e cancelado é cinza (não ganhou, mas não é alarme —
// já passou). Divergência de propósito, não descuido.
export const CLASSES_GANHOS = {
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-700',
  canceled:  'bg-gray-100 text-gray-700',
};

const CLASSE_RESERVA = 'bg-gray-100 text-gray-800';

/** Nome do status em português. Status desconhecido vira '—', NUNCA a palavra em inglês. */
export function rotuloDeStatus(status) {
  if (!status) return '—';
  const r = ROTULOS[status];
  if (r) return r;
  // Pro entregador, '—' é melhor que uma palavra em inglês: não finge ser
  // informação. Mas isso me deixaria cego pra um status novo, então o aviso
  // fica aqui. Em produção o build apaga todo console.*, então não custa nada —
  // e é justamente em desenvolvimento que precisa aparecer.
  console.warn(`[rotuloDeStatus] status sem nome em português: "${status}" — adicione em utils/rotuloDeStatus.js`);
  return '—';
}

/** Classe Tailwind do badge. `extras` sobrescreve por tela (ver CLASSES_GANHOS). */
export function classeDeStatus(status, extras = null) {
  if (extras && extras[status]) return extras[status];
  return CLASSES[status] || CLASSE_RESERVA;
}

/** Só pra teste/varredura: saber se um status tem nome. */
export function temRotulo(status) {
  return Boolean(status && ROTULOS[status]);
}
