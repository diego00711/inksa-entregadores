// src/utils/navegacao.js
//
// TODA a navegação do app sai daqui. UM lugar, de propósito.
//
// Antes isto vivia solto dentro do DeliveryDetailModal, e o resultado foi que
// o card da entrega — a tela onde o entregador realmente fica — não tinha
// navegação nenhuma. Duas implementações divergem; a pergunta nunca é se, é
// qual muda primeiro.
//
// ⚠️ NÃO DÁ PRA EMBUTIR O WAZE NUMA JANELA. O site dele recusa carregar dentro
// de outra página, e mesmo se deixasse seria o mapa web: sem voz, sem "vire à
// direita", sem recalcular quando erra a curva. Navegação de verdade é anos de
// engenharia e uma base de ruas que a gente não tem — então a gente ENTREGA o
// destino pro app que o entregador já usa. É o mesmo caminho que os apps de
// delivery seguem.

/** Sai da WebView do app. Sem isto o link abre DENTRO do Inksa, onde não há navegação. */
function abrirFora(url) {
  try {
    if (window.Capacitor?.Plugins?.Browser?.open) {
      window.Capacitor.Plugins.Browser.open({ url });
      return true;
    }
  } catch { /* sem plugin: cai no window.open */ }
  try {
    // ⚠️ '_system' é o que entrega pro Waze. '_blank' abre na própria WebView
    // e dá o mesmo nada de antes, só que com mais passos.
    return !!(window.open(url, '_system') || window.open(url, '_blank'));
  } catch {
    return false;
  }
}

const temCoord = (lat, lng) =>
  lat !== null && lat !== undefined && lng !== null && lng !== undefined &&
  !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng)) &&
  !(Number(lat) === 0 && Number(lng) === 0);

// ⚠️ COORDENADA, NÃO TEXTO. Mandar o endereço escrito faz o Waze geocodificar
// de novo por conta dele — e endereço com bairro ou CEP trocado leva o
// entregador pro lugar errado com toda a confiança do mundo. Foi o que
// aconteceu no pedido #1006 (13/09/2026). Texto fica só como último recurso.
export function abrirWaze(lat, lng, endereco) {
  return abrirFora(temCoord(lat, lng)
    ? `https://waze.com/ul?ll=${Number(lat)},${Number(lng)}&navigate=yes`
    : `https://waze.com/ul?q=${encodeURIComponent(endereco || '')}&navigate=yes`);
}

export function abrirMaps(lat, lng, endereco) {
  return abrirFora(temCoord(lat, lng)
    ? `https://www.google.com/maps/dir/?api=1&destination=${Number(lat)},${Number(lng)}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(endereco || '')}&travelmode=driving`);
}

// Status em que o entregador ainda NÃO pegou o pedido — ou seja, o destino é a
// LOJA. Depois de retirar, o destino vira o cliente.
const ANTES_DA_RETIRADA = new Set([
  'ready', 'accepted_by_delivery', 'preparing', 'pending',
]);

/**
 * Pra onde ESTA corrida aponta agora.
 *
 * O entregador não deveria ter que escolher entre dois botões enquanto dirige.
 * O pedido já sabe em que perna está: antes de retirar, o destino é a loja;
 * depois, é o cliente. O botão só precisa perguntar.
 *
 * Devolve { rotulo, lat, lng, endereco, perna }.
 */
export function destinoDaCorrida(pedido) {
  const p = pedido || {};
  const indoBuscar = ANTES_DA_RETIRADA.has(p.status);

  if (indoBuscar) {
    return {
      perna: 'loja',
      rotulo: p.restaurant_name ? `Ir até ${p.restaurant_name}` : 'Ir até a loja',
      lat: p.restaurant_latitude,
      lng: p.restaurant_longitude,
      endereco: p.restaurant_address || '',
    };
  }
  return {
    perna: 'cliente',
    rotulo: 'Levar ao cliente',
    lat: p.client_latitude,
    lng: p.client_longitude,
    // O endereço da entrega às vezes vem como objeto; quem chama já normaliza,
    // mas aqui aceita string direta também.
    endereco: typeof p.delivery_address === 'string' ? p.delivery_address : '',
  };
}

/** O destino tem coordenada? Sem ela o Waze vai por texto, que é menos confiável. */
export function destinoTemCoordenada(pedido) {
  const d = destinoDaCorrida(pedido);
  return temCoord(d.lat, d.lng);
}

/**
 * Pede ao servidor o push que vira o "voltar ao Inksa" na barra do sistema.
 *
 * ⚠️ O WAZE NÃO TEM BOTÃO DE VOLTAR pro app que o chamou — isso só existe pra
 * quem tem acordo de SDK com eles. E no Android um app não traz outro pra
 * frente. O Diego procurou esse caminho em 13/09/2026 e não achou: não existia.
 *
 * O que o sistema sabe fazer é notificação. Ela fica na barra enquanto o Waze
 * ocupa a tela, e tocar nela abre o app na tela da corrida (o listener de toque
 * já existia). As duas pontas estavam prontas; faltava disparar.
 *
 * ⚠️ DISPARA E SEGUE. Nada aqui pode atrasar a abertura do Waze: a pessoa
 * apertou "Dirigir" pra dirigir. Se a rede estiver ruim, o Waze abre do mesmo
 * jeito e ela volta pelos recentes, como antes.
 */
export function pedirAtalhoDeVolta(pedidoId) {
  if (!pedidoId) return;
  // Import tardio: este arquivo é usado em telas que não precisam da API, e
  // carregar o cliente HTTP junto com elas não tem porquê.
  //
  // apiFetch (e não fetch cru) porque ele põe o Authorization do token que
  // está valendo e renova antes de vencer. Token lido à mão congelaria o
  // valor do momento — e aqui a pessoa pode estar há horas na rua.
  Promise.all([
    import('../services/apiClient'),
    import('../services/api'),
  ]).then(([{ default: apiFetch }, { DELIVERY_API_URL }]) => {
    apiFetch(`${DELIVERY_API_URL}/api/orders/${pedidoId}/atalho-de-volta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,  // o app vai pro fundo em seguida; sem isto a requisição morre no meio
    }).catch(() => {});
  }).catch(() => { /* nunca atrapalha a navegação */ });
}
