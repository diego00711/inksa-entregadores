import { useState, useEffect } from 'react';
import { DELIVERY_API_URL, createAuthHeaders } from '../services/api';
import { Loader2, Medal, Check, Lock } from 'lucide-react';

const STYLE = {
  bronze:   { bg: 'bg-amber-50',  border: 'border-amber-300',  bar: 'bg-amber-500' },
  prata:    { bg: 'bg-gray-50',   border: 'border-gray-300',   bar: 'bg-gray-400' },
  ouro:     { bg: 'bg-yellow-50', border: 'border-yellow-400', bar: 'bg-yellow-500' },
  diamante: { bg: 'bg-cyan-50',   border: 'border-cyan-300',   bar: 'bg-cyan-500' },
};

export default function ClubePage() {
  const [status, setStatus] = useState(null);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch(`${DELIVERY_API_URL}/api/club/status`, { headers: createAuthHeaders() }).then(r => r.json()),
      fetch(`${DELIVERY_API_URL}/api/club/levels?audience=delivery`).then(r => r.json()),
    ])
      .then(([st, lv]) => {
        if (st?.status === 'success') setStatus(st.data);
        else setError(st?.error || 'Erro ao carregar o Clube');
        if (lv?.status === 'success') setLevels(lv.data || []);
      })
      .catch(() => setError('Não foi possível carregar o Clube Inksa'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="w-10 h-10 animate-spin text-orange-500" /></div>;
  }
  if (error) {
    return <div className="max-w-lg mx-auto px-4 py-16 text-center text-gray-600">{error}</div>;
  }

  const { current_level, next_level, orders_this_month = 0, orders_to_next_level = 0, motivation } = status || {};
  const st = STYLE[current_level?.level] || STYLE.bronze;
  const target = next_level ? next_level.min_orders : orders_this_month;
  const pct = target > 0 ? Math.min(100, Math.round((orders_this_month / target) * 100)) : 100;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center justify-center gap-2">
          <Medal className="w-6 h-6 text-amber-500" /> Clube Inksa
        </h1>
        <p className="text-sm text-gray-500 mt-1">Quanto mais você entrega, mais benefícios ganha</p>
      </div>

      {current_level && (
        <div className={`rounded-2xl border ${st.border} ${st.bg} p-5`}>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{current_level.emoji}</span>
            <div>
              <p className="text-xl font-extrabold text-gray-900">{current_level.name}</p>
              <p className="text-sm text-gray-600">{orders_this_month} entrega(s) este mês</p>
            </div>
          </div>

          {next_level && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{orders_this_month} entregas</span>
                <span>{next_level.min_orders} para {next_level.name} {next_level.emoji}</span>
              </div>
              <div className="w-full bg-white/70 rounded-full h-3 overflow-hidden">
                <div className={`h-3 rounded-full transition-all ${st.bar}`} style={{ width: `${pct}%` }} />
              </div>
              {motivation && <p className="text-sm font-semibold text-gray-700 mt-2">{motivation}</p>}
            </div>
          )}

          {current_level.benefits?.length > 0 && (
            <div className="mt-4 border-t border-white/60 pt-3">
              <p className="text-sm font-semibold text-gray-700 mb-2">Seus benefícios ativos</p>
              <ul className="space-y-1">
                {current_level.benefits.map((b, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <Check className="w-4 h-4 text-green-600 shrink-0" /> {b}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">Todos os níveis</h2>
        <div className="space-y-3">
          {levels.map((lvl) => {
            const isCurrent = current_level && lvl.level === current_level.level;
            return (
              <div key={lvl.level} className={`rounded-xl border p-4 ${isCurrent ? `${STYLE[lvl.level]?.border || 'border-orange-300'} ring-2 ring-orange-200` : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{lvl.emoji}</span>
                    <div>
                      <p className="font-bold text-gray-900">{lvl.name} {isCurrent && <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full ml-1">Você está aqui</span>}</p>
                      <p className="text-xs text-gray-500">
                        {lvl.max_orders ? `${lvl.min_orders}–${lvl.max_orders}` : `${lvl.min_orders}+`} entregas/mês
                      </p>
                    </div>
                  </div>
                </div>
                {lvl.benefits?.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {lvl.benefits.map((b, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                        {isCurrent ? <Check className="w-3 h-3 text-green-600" /> : <Lock className="w-3 h-3 text-gray-400" />} {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
