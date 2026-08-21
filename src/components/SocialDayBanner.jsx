// Banner do Dia I (Inksa Social): aparece quando o admin habilita em
// Admin → Inksa Social. Mostra o valor arrecadado ao vivo durante o evento.
import { useEffect, useRef, useState } from 'react';
import { HeartHandshake } from 'lucide-react';
import IndicarInstituicao from './IndicarInstituicao';

const API = import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com';

const money = (v) =>
  (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function SocialDayBanner() {
  const [info, setInfo] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`${API}/api/public/social-day`);
        const d = await r.json();
        if (!alive) return;
        setInfo(d);
        // ao vivo o contador cresce: atualiza a cada 60s; fora disso, 5 min
        timerRef.current = setTimeout(load, d?.phase === 'live' ? 60_000 : 300_000);
      } catch {
        if (alive) timerRef.current = setTimeout(load, 300_000);
      }
    };
    load();
    return () => {
      alive = false;
      clearTimeout(timerRef.current);
    };
  }, []);

  // A indicacao NAO depende do banner. O momento natural de abrir e quando o
  // Dia I anterior ja passou e o banner se escondeu sozinho — se a caixa
  // morasse so dentro dele, abrir as indicacoes nao mostraria nada.
  if (!info?.visible) {
    if (!info?.nominations_open) return null;
    return (
      <div className="mx-3 sm:mx-0 my-2 rounded-2xl border border-rose-200 bg-rose-50 p-4">
        <div className="flex items-start gap-3">
          <HeartHandshake className="w-7 h-7 shrink-0 text-rose-500" />
          <div className="min-w-0 flex-1">
            <p className="font-extrabold leading-tight text-rose-900">
              Dia I &mdash; voce escolhe quem recebe
            </p>
            <p className="mt-0.5 text-xs sm:text-sm leading-snug text-rose-800/80">
              Num dia por periodo, todo o lucro da Inksa vira acao social aqui na
              cidade. Estamos decidindo o destino do proximo &mdash; indique o seu.
            </p>
            <div className="[&_button]:!bg-rose-600 [&_button]:hover:!bg-rose-700">
              <IndicarInstituicao />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const dateBr = info.date ? info.date.split('-').reverse().join('/') : '';

  return (
    <div className="mx-3 sm:mx-0 my-2 rounded-2xl bg-gradient-to-r from-rose-500 via-orange-500 to-amber-400 text-white p-4 shadow-lg">
      <div className="flex items-center gap-3">
        <HeartHandshake className="w-9 h-9 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-extrabold leading-tight">Dia I — Inksa Social 💛</p>
          {info.phase === 'scheduled' && (
            <p className="text-xs sm:text-sm text-white/90 leading-snug">
              Dia {dateBr}, das {info.start_time} às {info.end_time}: todo o lucro da plataforma vira ação social.
            </p>
          )}
          {info.phase === 'live' && (
            <p className="text-xs sm:text-sm text-white/90 leading-snug">
              Acontecendo AGORA: cada pedido vira doação — todo o lucro da plataforma vai para ações sociais.
            </p>
          )}
          {info.phase === 'ended' && (
            <p className="text-xs sm:text-sm text-white/90 leading-snug">
              Evento encerrado. Obrigado por fazer parte! 💛
            </p>
          )}
          {/* A caixa de indicacao tem chave propria no admin: abre semanas
              antes do evento, pra chegar no Dia I com o destino ja decidido.
              Some sozinha depois que o evento acaba. */}
          {info.nominations_open && info.phase !== 'ended' && <IndicarInstituicao />}
        </div>
        {info.phase !== 'scheduled' && (
          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-wide text-white/80">
              {info.phase === 'live' ? 'Já arrecadado' : 'Total arrecadado'}
            </p>
            <p className="text-lg sm:text-2xl font-extrabold leading-tight">{money(info.raised)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
