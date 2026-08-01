// Avaliação ENXUTA do entregador ao TÉRMINO da entrega: só estrelas do
// restaurante + do cliente (+ comentário opcional), como a do cliente — nada de
// tags/categorias/tempo de preparo. Envia as duas de uma vez.
import React, { useState } from 'react';
import { Star, Loader2, CheckCircle2 } from 'lucide-react';
import { postRestaurantReview, postClientReview } from '../services/reviewService';

function StarRow({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className="w-8 h-8 flex items-center justify-center"
            aria-label={`${s} estrela${s > 1 ? 's' : ''}`}
          >
            <Star
              className={`w-7 h-7 transition-colors ${s <= value ? 'text-yellow-400' : 'text-gray-300'}`}
              fill={s <= value ? 'currentColor' : 'none'}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PostDeliveryRating({ order, onDone }) {
  const [restStars, setRestStars] = useState(5);
  const [cliStars, setCliStars] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const c = comment.trim();
      const jobs = [];
      // Cada uma tolera falha da outra (não trava a avaliação inteira por um lado).
      if (order?.restaurant_id) {
        jobs.push(
          postRestaurantReview({ restaurantId: order.restaurant_id, orderId: order.id, rating: restStars, comment: c }).catch(() => {}),
        );
      }
      if (order?.client_id) {
        jobs.push(
          postClientReview({ clientId: order.client_id, orderId: order.id, rating: cliStars, comment: c }).catch(() => {}),
        );
      }
      await Promise.all(jobs);
      setDone(true);
      setTimeout(() => onDone?.(true), 1100);
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="text-center py-4">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
        <p className="font-bold text-gray-800">Avaliação enviada!</p>
        <p className="text-sm text-gray-500">Obrigado pelo feedback 🙌</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 bg-gray-50 rounded-xl p-4">
        <StarRow label={`🍔 ${order?.restaurant_name || 'Restaurante'}`} value={restStars} onChange={setRestStars} />
        <div className="border-t border-gray-200" />
        <StarRow label={`🙋 ${order?.client_name || 'Cliente'}`} value={cliStars} onChange={setCliStars} />
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Comentário (opcional)"
        rows={2}
        maxLength={200}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
      />

      <button
        onClick={submit}
        disabled={saving}
        className="w-full min-h-[48px] py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold flex items-center justify-center gap-2"
      >
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Star className="w-5 h-5" />}
        {saving ? 'Enviando...' : 'Enviar avaliação'}
      </button>
    </div>
  );
}
