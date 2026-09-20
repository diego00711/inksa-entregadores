// src/utils/navegacao.js
//
// Import ESTATICO de proposito: o que este arquivo faz precisa acontecer na
// mesma batida do toque, e import() dinamico e promessa.
import { Capacitor } from '@capacitor/core';
import { DELIVERY_API_URL } from '../services/api';
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

/**
 * O endereço tem NÚMERO DE CASA? É isso que decide texto ou coordenada.
 *
 * Procura um número solto de 1 a 5 dígitos — "Rua X, 307", "Av. Y 1420".
 * Ignora número colado em CEP (8 dígitos) e em "31 de Março", que é nome.
 */
function temNumeroDeCasa(endereco) {
  const e = String(endereco || '');
  if (!e) return false;
  // tira CEP pra ele não passar por número de casa
  const semCep = e.replace(/\b\d{5}-?\d{3}\b/g, ' ');
  return /(?:^|,|\s)n?º?\s*\d{1,5}(?:\b|,)/i.test(semCep);
}

// ⚠️ NOME DE RUA COM NÚMERO CAI AQUI COMO FALSO POSITIVO — e está certo assim.
//
// "Rua 31 de Março - São Sebastião - Lages" não tem número de casa, mas o "31"
// dispara o teste acima e o endereço vai por TEXTO. Testado: acontece também
// com "15 de Novembro".
//
// Deixei de propósito, porque o resultado é MELHOR: o texto leva o bairro
// junto, e é o bairro que separa os 3 km dessa rua. A nossa coordenada, que
// seria a alternativa, apontava pro trecho errado — foi o passeio de 2,3 km do
// pedido #1006. Um detector "mais correto" aqui pioraria a entrega.

/**
 * COMO SE ESCOLHE O DESTINO — três regras, nesta ordem. A ordem é o conteúdo.
 *
 * 1º  COORDENADA PRECISA, quando existe.
 *     Só vale pro GPS do APARELHO do cliente (`client_coord_origem = 'gps'`),
 *     que tem precisão de metros. É o melhor dado que a plataforma tem.
 *
 *     ⚠️ Esta regra entrou em 16/09/2026 CONSERTANDO UM ERRO MEU do mesmo dia:
 *     fiz o carrinho puxar o número de casa do cadastro, o número entrou no
 *     texto, `temNumeroDeCasa` virou true — e a navegação trocou o ponto do GPS
 *     por uma busca de texto. Melhorei a leitura e piorei a entrega.
 *
 * 2º  TEXTO, quando há número de casa e a coordenada NÃO é precisa.
 *     Veio do pedido #1006 (13/09/2026). Eu tinha concluído o contrário
 *     ("coordenada sempre") e a razão estava errada: o que falhou ali não foi o
 *     texto, foi o ENDEREÇO, cadastrado com bairro e CEP de outro trecho da rua
 *     — e coordenada nasce do endereço, então saiu errada junto.
 *
 *       nossa coordenada  -> nível de RUA. Medido: a casa da cliente (nº 307) e
 *                            o Yo!Frango (nº 284) têm coordenada IDÊNTICA.
 *       Waze com o texto  -> às vezes nível de PORTA. Medido: o Waze achou
 *                            "Rua 31 de Março, 126" que o nosso não achou.
 *
 *     O Diego apontou o que isso significa na rua: a Rua 31 de Março tem ~3 km.
 *     Largar o entregador "na rua certa" ali é largar ele procurando.
 *
 *     ⚠️ Mas é APOSTA, não garantia. Em 16/09/2026 ficou provado que
 *     "Rua Rodolfo Reis Figueira 76, Lages" e a mesma rua sem número devolvem
 *     EXATAMENTE o mesmo resultado: essas ruas não têm numeração na base.
 *
 * 3º  COORDENADA imprecisa, como último recurso. Chega na rua, e é melhor que
 *     texto sem número nenhum.
 *
 * O conserto de verdade, que dispensa as três, continua pendente: o parceiro e
 * o cliente MARCAREM O PONTO no mapa.
 */
export function abrirWaze(lat, lng, endereco, opcoes = {}) {
  if (opcoes.coordPrecisa && temCoord(lat, lng)) {
    return abrirFora(`https://waze.com/ul?ll=${Number(lat)},${Number(lng)}&navigate=yes`);
  }
  const porTexto = temNumeroDeCasa(endereco);
  return abrirFora(porTexto
    ? `https://waze.com/ul?q=${encodeURIComponent(endereco)}&navigate=yes`
    : temCoord(lat, lng)
      ? `https://waze.com/ul?ll=${Number(lat)},${Number(lng)}&navigate=yes`
      : `https://waze.com/ul?q=${encodeURIComponent(endereco || '')}&navigate=yes`);
}

export function abrirMaps(lat, lng, endereco, opcoes = {}) {
  // Mesma precedência do abrirWaze — ver o comentário lá.
  if (opcoes.coordPrecisa && temCoord(lat, lng)) {
    return abrirFora(`https://www.google.com/maps/dir/?api=1&destination=${Number(lat)},${Number(lng)}`);
  }
  const porTexto = temNumeroDeCasa(endereco);
  const destino = porTexto
    ? encodeURIComponent(endereco)
    : temCoord(lat, lng)
      ? `${Number(lat)},${Number(lng)}`
      : encodeURIComponent(endereco || '');
  return abrirFora(`https://www.google.com/maps/dir/?api=1&destination=${destino}&travelmode=driving`);
}

/**
 * Endereço de entrega como TEXTO, venha ele como string, JSON ou objeto.
 *
 * Importa mais do que parece: é o texto que carrega o NÚMERO DA CASA, e é o
 * número que decide se o Waze vai até a porta ou larga o entregador na rua.
 * Devolvendo '' pra objeto (como estava), todo pedido cujo endereço veio
 * estruturado caía na coordenada de nível de rua sem ninguém perceber.
 */
function enderecoComoTexto(end) {
  if (!end) return '';
  if (typeof end === 'string') {
    const t = end.trim();
    if (!t.startsWith('{')) return t;
    try { return enderecoComoTexto(JSON.parse(t)); } catch { return t; }
  }
  if (typeof end !== 'object') return '';
  const partes = [
    [end.street, end.number].filter(Boolean).join(', '),
    end.neighborhood, end.city, end.state,
  ].filter(Boolean);
  return partes.join(' - ');
}

// Status em que o entregador ainda NÃO pegou o pedido — ou seja, o destino é a
// LOJA. Depois de retirar, o destino vira o cliente.
const ANTES_DA_RETIRADA = new Set([
  'ready', 'accepted_by_delivery', 'preparing', 'pending',
]);

/**
 * Endereço da LOJA, venha ele em que formato vier.
 *
 * ⚠️ O PEDIDO CHEGA EM DOIS FORMATOS, E SÓ UM TEM `restaurant_address`.
 *
 * `GET /api/orders/<id>` monta a string pronta, com número.
 * `GET /api/delivery/stats/dashboard-stats` — que é de onde sai a CORRIDA
 * ATIVA — manda as partes separadas: `restaurant_street`, `restaurant_number`,
 * `restaurant_neighborhood`, `restaurant_city`. Nenhum `restaurant_address`.
 *
 * Lendo só `p.restaurant_address`, a corrida ativa dava `undefined` -> texto
 * vazio -> `abrirWaze` caía na COORDENADA, que é de nível de rua. O número 76
 * do Gelaê estava no banco e nas duas rotas de pedido; ele se perdia aqui, na
 * última curva. Achado no teste do Diego em 16/09/2026.
 */
function enderecoDaLoja(p) {
  if (p.restaurant_address) return String(p.restaurant_address).trim();
  const rua = [p.restaurant_street, p.restaurant_number].filter(Boolean).join(', ');
  return [rua, p.restaurant_neighborhood, p.restaurant_city].filter(Boolean).join(' - ');
}

/**
 * Pra onde ESTA corrida aponta agora.
 *
 * O entregador não deveria ter que escolher entre dois botões enquanto dirige.
 * O pedido já sabe em que perna está: antes de retirar, o destino é a loja;
 * depois, é o cliente. O botão só precisa perguntar.
 *
 * Devolve { rotulo, lat, lng, endereco, perna, coordPrecisa }.
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
      endereco: enderecoDaLoja(p),
      // A coordenada da loja sai do nosso geocodificador, nível de rua. Nunca
      // é "precisa" no sentido daqui. O dia em que o parceiro marcar o ponto
      // no mapa, é esta linha que muda.
      coordPrecisa: false,
    };
  }
  return {
    perna: 'cliente',
    rotulo: 'Levar ao cliente',
    lat: p.client_latitude,
    lng: p.client_longitude,
    endereco: enderecoComoTexto(p.delivery_address),
    // ⚠️ SÓ 'gps' É PRECISO. O pedido carrega de onde a coordenada veio
    // (orders.client_coord_origem): 'gps' é o aparelho do cliente, metros;
    // 'endereco' é geocodificação, que resolve a RUA e devolve o MESMO ponto
    // pro nº 284 e pro nº 307 — medido nos dados reais.
    // NULL (pedido antigo) conta como impreciso, que mantém a regra de antes.
    coordPrecisa: p.client_coord_origem === 'gps',
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
/**
 * Apaga da barra o atalho de volta da corrida.
 *
 * O atalho é FIXO (`sticky`) de propósito: ele não some quando o entregador
 * toca, senão deixaria de ser atalho — ele voltaria ao app uma vez e teria que
 * sair e entrar no Waze de novo só pra fazer a notificação reaparecer.
 *
 * O preço de ser fixo é que alguém precisa apagar. O FCM não sabe: ele manda,
 * não remove. Quem sabe é o app, e a hora certa é quando a corrida acaba.
 *
 * ⚠️ Nunca lança e nunca atrasa: é limpeza de tela, não pode atrapalhar o
 * fechamento da entrega. No navegador o plugin nem existe.
 */
export async function limparAvisosDaCorrida() {
  try {
    if (!Capacitor.isNativePlatform()) return;
    const { PushNotifications } = await import('@capacitor/push-notifications');
    await PushNotifications.removeAllDeliveredNotifications();
  } catch { /* sem plugin ou sem permissão: a barra fica como está */ }
}

export function pedirAtalhoDeVolta(pedidoId) {
  if (!pedidoId) return;
  try {
    // ⚠️ NADA DE `await` ANTES DO fetch. ESTA É A REGRA DESTA FUNÇÃO.
    //
    // O Waze abre na linha seguinte e o app vai pro fundo NA MESMA HORA. No
    // WebView, JS em segundo plano congela — qualquer espera antes da chamada
    // perde a corrida e a requisição nunca sai.
    //
    // A primeira versão errou nisso duas vezes ao mesmo tempo:
    //   1. `import()` dinâmico, que é uma promessa
    //   2. `apiFetch`, que pode aguardar a renovação do token antes de disparar
    // Resultado: no teste do Diego (13/09/2026) o push não chegou. O código
    // estava certo, mas rodava tarde demais pra existir.
    //
    // Agora: token lido do armazenamento (síncrono) e `fetch` disparado na
    // MESMA batida do toque.
    //
    // O preço é não renovar token vencido. É o preço certo: se o token venceu,
    // esta pessoa está prestes a ser deslogada de qualquer jeito, e um atalho
    // de conveniência não é o lugar de resolver isso.
    const token = localStorage.getItem('deliveryAuthToken');
    if (!token) return;
    fetch(`${DELIVERY_API_URL}/api/orders/${pedidoId}/atalho-de-volta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      // keepalive: o navegador se compromete a terminar o envio mesmo com a
      // página indo embora. É o que existe justamente pra este caso.
      keepalive: true,
    }).catch(() => {});
  } catch { /* nunca atrapalha a navegação */ }
}
