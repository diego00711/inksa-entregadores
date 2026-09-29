// Avisa o entregador que o APK dele é antigo, e que o som alto de corrida nova
// depende de atualizar pela Play Store.
//
// ⚠️ POR QUE A DETECÇÃO É POR CANAL DE NOTIFICAÇÃO, E NÃO PELA VERSÃO DO APP.
//
// O app NÃO tem `@capacitor/app`, então não consegue ler a própria versão. E
// instalar esse plugin exigiria uma build nova — que é exatamente o que este
// público não tem. O aviso precisa funcionar DENTRO do APK velho, com o que já
// está instalado lá.
//
// O que dá pra perguntar ao aparelho hoje é a lista de canais de notificação
// (`@capacitor/push-notifications`, presente desde sempre). E ela separa as
// gerações com precisão:
//
//   • `inksa_urgente_v2` passou a ser criado no MainActivity.java em 16/09/2026
//     (commit 0ae966d5).
//   • A versão que ficou em produção até 28/09 é a 1.0.5, publicada em 16/08 —
//     um mês ANTES.
//
// Logo: canal ausente = APK velho = precisa atualizar. Canal presente = 1.0.7+.
//
// ⚠️ E não é só cosmético: enquanto houver gente sem o `_v2`, a chave
// `push_canal_entregador` NÃO pode apontar pra ele. Mandar push pra um canal
// que não existe no aparelho não deixa "sem som" — o Android DESCARTA a
// notificação inteira, em silêncio. Por isso este componente também reporta o
// resultado ao servidor: é o placar que diz quando a virada fica segura.

import { useEffect, useState } from 'react';
import { ArrowUpCircle, X } from 'lucide-react';
import { abrirFora } from '../utils/navegacao';
import { DELIVERY_API_URL, createAuthHeaders } from '../services/api';
import apiFetch from '../services/apiClient';

const LOJA = 'https://play.google.com/store/apps/details?id=com.inksa.entregador';
const CANAL_NOVO = 'inksa_urgente_v2';
const ADIADO_ATE = 'inksa.entregador.aviso_atualizar_adiado_ate';

/**
 * Pergunta ao Android quais canais existem.
 *
 * ⚠️ O PRAZO PROTEGE SÓ A CHAMADA PERIGOSA, e a resposta é fail-closed.
 *
 * Chamada de plugin que trava NÃO rejeita — ela fica pendurada, e o `catch`
 * nunca dispara (foi o que custou a tarde de 27/09 no serviço de turno). Aqui,
 * se a lista não vier em 4s, devolvemos `null` = "não sei", e quem não sabe NÃO
 * mostra o aviso. Incomodar quem já atualizou é pior que deixar um caso pra
 * trás, ainda mais com 17 aparelhos no total — esses o Diego alcança na mão.
 */
async function temCanalNovo() {
  try {
    if (!window.Capacitor?.isNativePlatform?.()) return null;   // navegador
    if (window.Capacitor?.getPlatform?.() !== 'android') return null;

    const { PushNotifications } = await import('@capacitor/push-notifications');
    const r = await Promise.race([
      PushNotifications.listChannels(),
      new Promise((ok) => setTimeout(() => ok('__travou__'), 4000)),
    ]);
    if (r === '__travou__') return null;

    const lista = r?.channels;
    if (!Array.isArray(lista)) return null;
    return lista.some((c) => c?.id === CANAL_NOVO);
  } catch {
    return null;
  }
}

export default function AvisoAtualizarApp() {
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    let vivo = true;

    (async () => {
      const temNovo = await temCanalNovo();
      if (!vivo || temNovo === null) return;       // não sei: não incomoda

      // Reporta SEMPRE, inclusive quem já está atualizado — sem o "já está ok"
      // o placar não tem denominador e não dá pra saber quando virar a chave.
      // Best-effort: falhar aqui não pode segurar o aviso.
      try {
        await apiFetch(`${DELIVERY_API_URL}/api/delivery/app-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...createAuthHeaders() },
          body: JSON.stringify({ canal_v2: temNovo }),
        });
      } catch { /* sem rede: o placar espera a próxima abertura */ }

      if (temNovo) return;

      // Adiar guarda um PRAZO, não um "não mostrar mais": o objetivo é que a
      // pessoa atualize, e some sozinho quando ela atualizar.
      try {
        const ate = Number(localStorage.getItem(ADIADO_ATE) || 0);
        if (ate && Date.now() < ate) return;
      } catch { /* localStorage bloqueado: mostra assim mesmo */ }

      if (vivo) setMostrar(true);
    })();

    return () => { vivo = false; };
  }, []);

  if (!mostrar) return null;

  const adiar = () => {
    try {
      localStorage.setItem(ADIADO_ATE, String(Date.now() + 24 * 60 * 60 * 1000));
    } catch { /* sem localStorage: volta na próxima abertura, tudo bem */ }
    setMostrar(false);
  };

  return (
    <div className="mx-3 sm:mx-0 my-2 rounded-2xl border border-orange-300 bg-orange-50 p-4">
      <div className="flex items-start gap-3">
        <ArrowUpCircle className="w-7 h-7 shrink-0 text-orange-500" />
        <div className="min-w-0 flex-1">
          <p className="font-extrabold leading-tight text-orange-900">
            Atualize o app para ouvir a corrida nova
          </p>
          <p className="mt-0.5 text-xs sm:text-sm leading-snug text-orange-900/80">
            Seu app está numa versão antiga. Na nova, o aviso de corrida toca no
            volume de ALARME, com som próprio e mais longo — dá pra ouvir com o
            celular no bolso.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => abrirFora(LOJA)}
              className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600"
            >
              Atualizar agora
            </button>
            <button
              type="button"
              onClick={adiar}
              className="rounded-xl px-3 py-2 text-sm font-semibold text-orange-900/70 hover:bg-orange-100"
            >
              Depois
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={adiar}
          aria-label="Fechar aviso"
          className="shrink-0 rounded-lg p-1 text-orange-900/50 hover:bg-orange-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
