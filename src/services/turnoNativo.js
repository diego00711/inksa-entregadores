// Serviço de turno do Android: mantém o entregador online com o app fechado.
//
// Só faz alguma coisa dentro do APK. No navegador (e no iPhone, que não tem
// equivalente) todas as funções aqui saem calado devolvendo false, e o app
// continua com o sinal de vida em JavaScript — que é o comportamento de sempre.
//
// O porquê está no HeartbeatService.java. Resumo: o Android congela os
// temporizadores do JS com o celular bloqueado, o sinal de vida para e o
// servidor tira o entregador da fila. Um serviço em primeiro plano é a única
// forma que o sistema oferece de um app continuar trabalhando de verdade.

import { DELIVERY_API_URL, createAuthHeaders } from './api';
import apiFetch from './apiClient';

let plugin = null;
let tentouCarregar = false;

async function pegarPlugin() {
  if (tentouCarregar) return plugin;
  tentouCarregar = true;
  try {
    const { Capacitor, registerPlugin } = await import('@capacitor/core');
    // No navegador o plugin não existe; sem esta guarda a chamada estoura
    // "not implemented on web" toda vez que o entregador liga o botão.
    if (!Capacitor?.isNativePlatform?.() || Capacitor.getPlatform() !== 'android') {
      plugin = null;
      return null;
    }
    plugin = registerPlugin('Turno');
  } catch {
    plugin = null;
  }
  return plugin;
}

export function temServicoDeTurno() {
  return !!plugin;
}

/**
 * Liga o serviço. Busca a credencial estreita no backend (30 dias, só vale em
 * /api/delivery/heartbeat) e entrega pro lado nativo.
 *
 * Nunca levanta: turno nativo é um GANHO, não um requisito. Se qualquer parte
 * falhar — backend sem segredo, Android recusando iniciar o serviço, aparelho
 * sem a permissão — o app segue com o sinal de vida do JS.
 *
 * @returns {Promise<boolean>} true se o serviço está de pé.
 */
export async function ligarTurno() {
  const p = await pegarPlugin();
  if (!p) return false;
  try {
    const r = await apiFetch(`${DELIVERY_API_URL}/api/delivery/heartbeat-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...createAuthHeaders() },
    });
    // 503 = instalação sem segredo de assinatura. Não é erro do entregador.
    if (!r.ok) return false;
    const json = await r.json();
    const token = json?.data?.token;
    if (!token) return false;

    await p.iniciar({ apiUrl: DELIVERY_API_URL, token });
    return true;
  } catch {
    return false;
  }
}

/** Desliga o serviço e tira a notificação permanente da barra. */
export async function desligarTurno() {
  const p = await pegarPlugin();
  if (!p) return false;
  try {
    await p.parar();
    return true;
  } catch {
    return false;
  }
}
