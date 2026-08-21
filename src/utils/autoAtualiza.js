// Faz o app pegar a versão nova sem o usuário ter que fechar e abrir.
//
// O PROBLEMA. Os apps rodam numa WebView do Capacitor apontando pro site
// (server.url). A WebView carrega o index.html UMA vez, no cold start, e fica
// viva enquanto o app existir. Minimizar e voltar não é navegação: o JavaScript
// antigo continua rodando, com o mapa de arquivos antigo, e nunca pede os
// novos. Publicar deixa de significar entregar — a correção só chega em quem
// fecha o app de verdade, e ninguém fecha.
//
// COMO DESCOBRE QUE SAIU VERSÃO NOVA. Sem carimbo de build, sem configurar
// nada: o Vite dá nome novo ao bundle a cada publicação, e o index.html sempre
// aponta pro nome atual. Então basta baixar o index e comparar o nome de lá
// com o que ESTE app carregou. Se mudou, tem versão nova. A fonte da verdade é
// a mesma que o navegador usa.
//
// QUANDO RECARREGA — e é aqui que mora o cuidado. Recarregar na hora erra
// feio: a pessoa pode estar digitando endereço, ou ter saído pro banco pra
// copiar o código PIX e voltado no meio do pagamento. Recarregar ali apaga o
// que ela estava fazendo pra entregar uma correção que podia esperar cinco
// minutos. Então:
//
//   • só recarrega ao VOLTAR pro app depois de um tempo fora (ninguém está
//     digitando nesse instante);
//   • nunca em tela sensível (carrinho, pagamento, acompanhamento);
//   • no máximo uma vez por versão, com trava em sessionStorage — bug de
//     detecção vira laço de recarga, que é muito pior que app desatualizado.
//
// Fora dessas condições ele só anota que tem versão nova e espera a próxima
// oportunidade segura. Atrasar a atualização é aceitável; atrapalhar não.

const CHECAGEM_MS = 30 * 60 * 1000;   // relê o index de tempos em tempos
const FORA_MINIMO_MS = 60 * 1000;     // tempo fora que torna a volta um momento seguro
const TRAVA = 'inksa_recarga_alvo';

/** Nome do bundle que ESTE app carregou. */
function bundleAtual() {
  // O script de entrada é o único <script type="module"> com src do build.
  const s = document.querySelector('script[type="module"][src*="/assets/"]');
  if (s?.src) return new URL(s.src, location.origin).pathname;
  // Fallback: alguns navegadores reescrevem a tag; o recurso continua nas
  // métricas de rede.
  const ent = performance.getEntriesByType?.('resource') || [];
  const m = ent.map((e) => e.name).find((n) => /\/assets\/index-[^/]+\.js$/.test(n));
  return m ? new URL(m).pathname : null;
}

/** Nome do bundle que o servidor está publicando AGORA. */
async function bundlePublicado() {
  // O parâmetro é obrigatório: o service worker responde cache-first pra tudo
  // que não é navegação, e sem uma URL nova ele devolveria o index guardado —
  // a checagem compararia a versão antiga com ela mesma, pra sempre.
  const r = await fetch(`/index.html?__ver=${Date.now()}`, { cache: 'no-store' });
  if (!r.ok) return null;
  const html = await r.text();
  const m = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
  return m ? m[1] : null;
}

export function iniciarAutoAtualizacao({ rotasSensiveis = [] } = {}) {
  if (typeof window === 'undefined') return;

  const atual = bundleAtual();
  if (!atual) return;   // não deu pra saber a versão: não faz nada

  let novoBundle = null;
  let saiuEm = null;

  const emTelaSensivel = () => {
    const p = (location.pathname || '').toLowerCase();
    return rotasSensiveis.some((r) => p.includes(r));
  };

  const recarregar = () => {
    // Uma recarga por versão. Se a detecção estiver errada, o app fica
    // desatualizado — não entra em laço.
    if (sessionStorage.getItem(TRAVA) === novoBundle) return;
    try { sessionStorage.setItem(TRAVA, novoBundle); } catch { /* modo restrito */ }
    location.reload();
  };

  const conferir = async () => {
    try {
      const publicado = await bundlePublicado();
      if (publicado && publicado !== atual) novoBundle = publicado;
    } catch {
      // Sem rede, ou servidor fora: segue com a versão que está rodando.
    }
  };

  const talvezRecarregar = () => {
    if (!novoBundle) return;
    if (emTelaSensivel()) return;
    const foraTempoSuficiente = saiuEm && Date.now() - saiuEm >= FORA_MINIMO_MS;
    if (foraTempoSuficiente) recarregar();
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      saiuEm = Date.now();
      return;
    }
    // Voltou: confere e, se der, aplica agora — é o momento em que ninguém
    // está no meio de digitar.
    conferir().then(talvezRecarregar);
  });

  setInterval(conferir, CHECAGEM_MS);
  // Primeira checagem com folga: no cold start o app acabou de carregar a
  // versão mais nova, e bater no servidor junto com o resto da inicialização
  // só atrasa a primeira tela.
  setTimeout(conferir, 45 * 1000);
}
