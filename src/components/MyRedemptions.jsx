// Meus resgates — histórico de recompensas resgatadas pelo entregador, com o
// status de cada uma. Sem isto ele resgatava e não tinha onde acompanhar (nem
// conferir quantos pontos saíram do saldo).
//
// `refreshKey`: muda quando um resgate novo é feito na página, forçando recarga.
import React, { useEffect, useState } from 'react';
import { Gift, Loader2, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { DELIVERY_API_URL, createAuthHeaders } from '../services/api';

const STATUS_META = {
  pending:   { label: 'Em análise', cls: 'bg-amber-100 text-amber-700', Icon: Clock },
  approved:  { label: 'Aprovado',   cls: 'bg-blue-100 text-blue-700',   Icon: CheckCircle2 },
  delivered: { label: 'Entregue',   cls: 'bg-green-100 text-green-700', Icon: CheckCircle2 },
  rejected:  { label: 'Recusado',   cls: 'bg-red-100 text-red-700',     Icon: XCircle },
  cancelled: { label: 'Cancelado',  cls: 'bg-gray-100 text-gray-600',   Icon: XCircle },
};

function fmtData(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function MyRedemptions({ refreshKey = 0 }) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${DELIVERY_API_URL}/api/gamification/rewards/my-redemptions`,
          { headers: createAuthHeaders() }
        );
        if (!res.ok) throw new Error('falha');
        const json = await res.json();
        const list = json?.data?.items ?? json?.items ?? [];
        if (!vivo) return;
        setItems(Array.isArray(list) ? list : []);
        setError(null);
      } catch {
        if (vivo) setError('Não foi possível carregar seus resgates.');
      } finally {
        if (vivo) setLoading(false);
      }
    })();
    return () => { vivo = false; };
  }, [refreshKey]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Gift className="h-5 w-5 text-purple-500" />
        <h3 className="text-base font-bold text-gray-800">Meus resgates</h3>
        {items.length > 0 && (
          <span className="ml-auto text-xs font-semibold text-gray-500">{items.length}</span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="animate-spin w-6 h-6 text-purple-400" />
        </div>
      ) : error ? (
        <p className="text-center text-red-500 text-sm py-4">{error}</p>
      ) : items.length === 0 ? (
        <div className="text-center py-6">
          <Gift className="mx-auto h-9 w-9 text-gray-300 mb-2" />
          <p className="text-gray-500 text-sm">Você ainda não resgatou nenhuma recompensa.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => {
            const meta = STATUS_META[it.status] || STATUS_META.pending;
            const { Icon } = meta;
            const isEmoji = it.icon && !/^https?:\/\//.test(it.icon);
            return (
              <li key={it.id} className="flex items-center gap-3 border border-gray-100 rounded-xl p-3">
                {it.image_url ? (
                  <img src={it.image_url} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
                ) : isEmoji ? (
                  <span className="text-3xl leading-none shrink-0">{it.icon}</span>
                ) : (
                  <div className="w-11 h-11 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                    <Gift className="h-5 w-5 text-purple-500" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-800 truncate">{it.reward_name}</p>
                  <p className="text-xs text-gray-500">
                    {fmtData(it.created_at)} · <span className="font-semibold text-purple-600">-{it.points_used} pts</span>
                  </p>
                </div>

                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${meta.cls}`}>
                  <Icon className="h-3.5 w-3.5" />
                  {meta.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
