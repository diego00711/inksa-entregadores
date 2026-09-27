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

// ⚠️ POR QUE NÃO SE GUARDA FRACASSO (26/09/2026).
//
// Antes havia um `tentouCarregar` que memorizava a PRIMEIRA tentativa, desse
// certo ou errado. Um tropeço qualquer na estreia — a ponte do Capacitor ainda
// não pronta, o chunk do `import()` dinâmico voltando index.html depois de um
// deploy — e o app gravava "não tem plugin" para o resto da sessão. Nem ficar
// online de novo fazia ele tentar outra vez.
//
// Guardar SUCESSO economiza trabalho; guardar FRACASSO transforma um tropeço
// momentâneo em defeito permanente e silencioso. Agora só o sucesso fica.
//
// O sintoma que isso produzia era perfeito pra enganar: o serviço nativo nunca
// subia, mas o batimento do JavaScript continuava chegando com o app aberto —
// então, no banco, o entregador parecia perfeitamente online.
let ultimoMotivo = 'ainda nao tentou';

async function pegarPlugin() {
  if (plugin) return plugin;
  try {
    const { Capacitor, registerPlugin } = await import('@capacitor/core');
    // No navegador o plugin não existe; sem esta guarda a chamada estoura
    // "not implemented on web" toda vez que o entregador liga o botão.
    if (!Capacitor?.isNativePlatform?.()) {
      ultimoMotivo = 'nao e app nativo (navegador)';
      return null;
    }
    const plataforma = Capacitor.getPlatform();
    if (plataforma !== 'android') {
      ultimoMotivo = `plataforma ${plataforma} (servico so existe no Android)`;
      return null;
    }
    plugin = registerPlugin('Turno');
    ultimoMotivo = 'ok';
  } catch (e) {
    // O `catch` vazio que existia aqui é o mesmo erro do canal de notificação
    // em 16/09: se falhar, o app segue funcionando e ninguém fica sabendo.
    ultimoMotivo = `falha ao carregar: ${e?.message || e}`;
    plugin = null;
  }
  return plugin;
}

export function temServicoDeTurno() {
  return !!plugin;
}

/**
 * Estado do serviço de turno, pro cartão de diagnóstico da tela de Suporte.
 *
 * ⚠️ EXISTE PORQUE FICAMOS CEGOS (26/09/2026). O build de produção apaga todo
 * `console.*`, então um defeito no APK em campo não deixa rastro nenhum. Este
 * app passou semanas sem NUNCA subir o serviço de turno — o canal
 * `inksa_turno` não existia no aparelho do Diego — e nada em lugar nenhum
 * dizia isso. A única pista teria sido a AUSÊNCIA de um pedido no log do
 * servidor, que ninguém procura.
 *
 * `estaRodando` vem do próprio plugin nativo: é a resposta do Android, não a
 * nossa suposição sobre ele.
 */
export async function diagnosticoDoTurno() {
  const out = { ehApp: false, plataforma: null, temPlugin: false,
                motivo: ultimoMotivo, estaRodando: null, erro: null,
                // ⚠️ O QUE O JAVASCRIPT ENXERGA (27/09/2026).
                //
                // O log do Android provou que a chamada NUNCA chega ao lado
                // nativo: nem o erro "plugin não encontrado" aparece, e os
                // plugins oficiais funcionam no mesmo app. Ou seja, o problema
                // está antes — no que o bridge do Capacitor anuncia pro JS.
                //
                // `PluginHeaders` é a lista que o lado nativo INJETA dizendo
                // quais plugins existem e quais métodos cada um tem. Se `Turno`
                // não estiver nela, o registro nativo não chegou ao JS, e não
                // adianta procurar mais nada do lado de cá.
                disponivel: null, plugins: null };
  try {
    const { Capacitor } = await import('@capacitor/core');
    out.ehApp = !!Capacitor?.isNativePlatform?.();
    out.plataforma = Capacitor?.getPlatform?.() ?? null;
    try {
      out.disponivel = Capacitor?.isPluginAvailable?.('Turno') ?? null;
      const cabecalhos = (typeof window !== 'undefined' && window.Capacitor?.PluginHeaders) || null;
      out.plugins = cabecalhos
        ? cabecalhos.map((p) => p.name).sort().join(',')
        : Object.keys(window?.Capacitor?.Plugins || {}).sort().join(',');
    } catch { /* lista é extra: não pode derrubar o diagnóstico */ }
  } catch (e) {
    out.erro = e?.message || String(e);
    return out;
  }
  const p = await pegarPlugin();
  out.temPlugin = !!p;
  out.motivo = ultimoMotivo;
  if (!p) return out;
  try {
    const r = await p.estaRodando();
    out.estaRodando = !!(r?.rodando ?? r?.value ?? r);
  } catch (e) {
    out.erro = e?.message || String(e);
  }
  return out;
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
  if (!p) return false;   // pegarPlugin já anotou o motivo
  try {
    const r = await apiFetch(`${DELIVERY_API_URL}/api/delivery/heartbeat-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...createAuthHeaders() },
    });
    // 503 = instalação sem segredo de assinatura. Não é erro do entregador.
    // ⚠️ Cada saída anota o PORQUÊ. Antes as cinco devolviam `false` calado e
    // eram indistinguíveis: com o serviço nunca subindo, não havia como saber
    // se faltava credencial no servidor, se o Android recusou, ou se o plugin
    // nem existia no APK.
    if (!r.ok) {
      ultimoMotivo = r.status === 503
        ? 'servidor sem segredo de assinatura (HEARTBEAT_TOKEN_SECRET)'
        : `heartbeat-token devolveu ${r.status}`;
      return false;
    }
    const json = await r.json();
    const token = json?.data?.token;
    if (!token) {
      ultimoMotivo = 'resposta do heartbeat-token veio sem token';
      return false;
    }

    await p.iniciar({ apiUrl: DELIVERY_API_URL, token });
    ultimoMotivo = 'ok';
    return true;
  } catch (e) {
    ultimoMotivo = `iniciar falhou: ${e?.message || e}`;
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
