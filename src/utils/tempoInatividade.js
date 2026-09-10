// Quanto tempo sem toque na tela antes de deslogar — vem do admin
// (platform_settings.idle_logout_minutes, servido por /api/public/app-config).
//
// ⚠️ POR QUE ISTO VIROU UM ARQUIVO (09/09/2026)
//
// Antes a busca morava solta no layout e terminava em `.catch(() => {})`. Numa
// falha de rede — uma oscilação na hora de abrir o app basta — o erro era
// engolido e o app ficava com UMA HORA fixa no código, calada, enquanto o
// admin dizia 500 minutos. O entregador era deslogado no meio do turno, ficava
// offline sem perceber, e parava de receber pedido. Ninguém tinha como
// descobrir: não havia aviso em lugar nenhum.
//
// Duas mudanças que resolvem o problema:
//   1. TENTA DE NOVO (3 vezes, com espera crescente) antes de desistir.
//   2. LEMBRA O ÚLTIMO VALOR que deu certo. Falhou hoje? usa o que o admin
//      disse da última vez, não um número inventado no código.
//
// ⚠️ O console.warn lá embaixo NÃO EXISTE EM PRODUÇÃO: o vite.config faz
// `drop: ['console','debugger']` no build de produção. Ele serve pra quem
// estiver rodando em desenvolvimento — não conte com ele pra diagnosticar
// aparelho de entregador em campo. O que protege o usuário são os itens 1 e 2,
// que valem nos dois ambientes.
//
// O padrão do código só vale pra quem NUNCA conseguiu buscar — primeira
// abertura, sem rede. Aí uma hora é a escolha conservadora certa: é a
// configuração de segurança, e na dúvida ela deve valer, não sumir.

const CHAVE = 'inksa.idle_logout_ms';
export const PADRAO_MS = 60 * 60 * 1000;

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/** Último valor que o servidor confirmou, ou null. */
export function tempoLembrado() {
  try {
    const v = Number(localStorage.getItem(CHAVE));
    // 0 é VÁLIDO (recurso desligado no admin) — por isso `>= 0`, e não
    // um teste de veracidade, que descartaria o zero junto com o lixo.
    return Number.isFinite(v) && v >= 0 ? v : null;
  } catch {
    return null;   // modo privado / storage bloqueado
  }
}

function lembrar(ms) {
  try { localStorage.setItem(CHAVE, String(ms)); } catch { /* sem storage */ }
}

/** Valor pra usar enquanto a busca não responde. */
export function tempoInicial() {
  const salvo = tempoLembrado();
  return salvo === null ? PADRAO_MS : salvo;
}

/**
 * Busca o tempo no servidor. Devolve o valor em ms, ou null se não conseguiu
 * descobrir — e nesse caso quem chama fica com o que já tinha.
 */
export async function buscarTempo(apiUrl, { tentativas = 3 } = {}) {
  let ultimoErro = null;

  for (let i = 0; i < tentativas; i++) {
    try {
      // no-store: config de segurança não pode vir de cache velho.
      const r = await fetch(`${apiUrl}/api/public/app-config`, { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const min = Number(d?.idle_logout_minutes);
      if (!Number.isFinite(min)) throw new Error('resposta sem idle_logout_minutes');

      const ms = min > 0 ? min * 60000 : 0;
      lembrar(ms);
      return ms;
    } catch (e) {
      ultimoErro = e;
      if (i < tentativas - 1) await espera(1000 * 2 ** i);   // 1s, depois 2s
    }
  }

  const salvo = tempoLembrado();
  console.warn(
    '[inatividade] não deu pra ler o tempo no servidor (%s). Usando %s.',
    ultimoErro?.message || 'motivo desconhecido',
    salvo === null
      ? `o padrão do app (${PADRAO_MS / 60000} min)`
      : `o último valor do admin (${salvo / 60000} min)`,
  );
  return null;
}
