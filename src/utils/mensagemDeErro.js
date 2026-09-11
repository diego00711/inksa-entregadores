// src/utils/mensagemDeErro.js
//
// Traduz o erro que veio do `catch` para uma frase que serve a quem está NA RUA.
//
// ── O PROBLEMA ───────────────────────────────────────────────────────────────
// O app fazia `addToast(e?.message || 'Erro ao confirmar entrega. Verifique o
// código e tente novamente.')`. Quando o problema é a CONEXÃO, o `fetch` do
// navegador lança `TypeError: Failed to fetch` — e `e.message` existe, então o
// entregador via a frase em inglês, literalmente "Failed to fetch", parado na
// porta do cliente.
//
// E quando não via isso, via pior: a mensagem de reserva culpava o CÓDIGO
// ("Verifique o código e tente novamente") por um problema de sinal. A pessoa
// reconfere um código certo, redigita, leva o mesmo erro, e conclui que o app
// está quebrado — ou que o cliente passou o código errado.
//
// ── A REGRA ──────────────────────────────────────────────────────────────────
// Erro de rede tem frase própria, que diz três coisas: o que aconteceu, que a
// culpa não é dele, e o que fazer. Qualquer outro erro segue como antes — se o
// servidor explicou o motivo ("código inválido"), essa explicação é melhor que
// qualquer texto genérico e passa direto.

/** O `fetch` morreu antes de falar com o servidor? */
export function ehErroDeRede(e) {
  // O navegador já sabe que está sem rede — resposta mais confiável que o texto.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;

  // `fetch` rejeitado por rede lança TypeError. É o sinal mais estável que
  // existe aqui; a MENSAGEM muda por navegador e por idioma do aparelho.
  if (e instanceof TypeError) return true;

  const m = String(e?.message || '').toLowerCase();
  return (
    m.includes('failed to fetch') ||       // Chrome/Edge
    m.includes('networkerror') ||          // Firefox
    m.includes('load failed') ||           // Safari (iOS!)
    m.includes('network request failed') ||
    m.includes('sem conexão')              // o 503 sintético do apiClient
  );
}

/**
 * Frase para mostrar ao entregador.
 *
 * @param {unknown} e        o erro do catch
 * @param {string} reserva   o que dizer quando não é rede e o servidor não explicou
 * @param {string} [naRede]  frase de rede sob medida para esta ação
 */
export function mensagemDeErro(e, reserva, naRede) {
  if (ehErroDeRede(e)) {
    return naRede || 'Sem conexão agora. Assim que o sinal voltar, tente de novo.';
  }
  return e?.message || reserva;
}
