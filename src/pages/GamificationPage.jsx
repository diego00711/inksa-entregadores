import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Target, Star, Loader2, AlertCircle, Zap } from 'lucide-react';
import { DELIVERY_API_URL, createAuthHeaders } from '../services/api';
import authService from '../services/authService';

const LEVELS = {
  1: { name: 'Bronze',   gradient: 'from-amber-400 to-amber-600'   },
  2: { name: 'Prata',    gradient: 'from-slate-300 to-slate-500'   },
  3: { name: 'Ouro',     gradient: 'from-yellow-400 to-yellow-600' },
  4: { name: 'Platina',  gradient: 'from-cyan-400 to-cyan-600'     },
  5: { name: 'Diamante', gradient: 'from-purple-400 to-purple-600' },
};

const POINTS_TABLE = [
  { action: 'Entrega concluída',        pts: '+30' },
  { action: 'Pedido aceito',            pts: '+5'  },
  { action: 'Avaliação 5 estrelas',     pts: '+15' },
  { action: 'Meta diária concluída',    pts: '+50' },
];

const DAILY_GOALS = [
  { label: '3 entregas no dia',  pts: 50 },
  { label: '5 estrelas seguidas', pts: 25 },
  { label: 'Sem cancelamentos',  pts: 20 },
];

export default function GamificationPage() {
  const [userPoints, setUserPoints] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const currentUser = authService.getCurrentUser();
        if (!currentUser?.id) throw new Error('Sessão expirada. Faça login novamente.');

        const headers = createAuthHeaders();

        const [ptsRes, lbRes] = await Promise.all([
          fetch(`${DELIVERY_API_URL}/api/gamification/${currentUser.id}/points-level`, { headers }),
          fetch(`${DELIVERY_API_URL}/api/gamification/leaderboard?scope=delivery&limit=10`, { headers }),
        ]);

        if (!ptsRes.ok) throw new Error('Não foi possível carregar seus pontos.');
        const ptsJson = await ptsRes.json();
        setUserPoints(ptsJson.data || ptsJson);

        if (lbRes.ok) {
          const lbJson = await lbRes.json();
          const users = lbJson.data?.users ?? lbJson.data ?? lbJson.users ?? [];
          setLeaderboard(Array.isArray(users) ? users : []);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
        <Loader2 className="animate-spin w-10 h-10 text-orange-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 gap-3 p-6">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-red-600 font-medium text-center">{error}</p>
      </div>
    );
  }

  const lvl = Math.min(userPoints?.current_level || 1, 5);
  const totalPts = userPoints?.total_points || 0;
  const toNext = userPoints?.points_to_next_level ?? 0;
  const levelName = userPoints?.level_name || LEVELS[lvl]?.name || 'Bronze';
  const { gradient } = LEVELS[lvl] || LEVELS[1];

  const LEVEL_GAP = { 1: 300, 2: 500, 3: 700, 4: 1000, 5: 0 };
  const gap = LEVEL_GAP[lvl] || 300;
  const progress = toNext > 0 ? Math.max(5, Math.min(100, Math.round(((gap - toNext) / gap) * 100))) : 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-4 pb-12">
      <div className="max-w-lg mx-auto space-y-5">

        <h1 className="text-2xl font-bold text-gray-800 text-center pt-2">Minha Gamificação</h1>

        {/* Level card */}
        <div className={`rounded-2xl bg-gradient-to-br ${gradient} p-6 text-white shadow-xl`}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-white/70 text-xs uppercase tracking-widest mb-1">Nível atual</p>
              <h2 className="text-3xl font-black">{levelName}</h2>
            </div>
            <div className="bg-white/20 rounded-full p-3">
              <Trophy className="w-8 h-8 text-white" />
            </div>
          </div>

          <p className="text-5xl font-black tabular-nums">{totalPts.toLocaleString('pt-BR')}</p>
          <p className="text-white/70 text-sm mb-4">pontos acumulados</p>

          {toNext > 0 ? (
            <>
              <div className="bg-black/20 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-white h-2.5 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-white/70 text-xs mt-2">
                {toNext.toLocaleString('pt-BR')} pts para o próximo nível ({progress}% concluído)
              </p>
            </>
          ) : (
            <p className="text-white/80 text-sm font-semibold">Nível máximo atingido!</p>
          )}
        </div>

        {/* How to earn */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
            <Zap className="w-4 h-4 text-orange-500" />
            Como ganhar pontos
          </h3>
          <div className="divide-y divide-gray-50">
            {POINTS_TABLE.map(({ action, pts }) => (
              <div key={action} className="flex justify-between items-center py-2.5">
                <span className="text-sm text-gray-600">{action}</span>
                <span className="text-sm font-bold text-green-600">{pts}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Daily goals */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
            <Target className="w-4 h-4 text-green-500" />
            Metas Diárias
          </h3>
          <div className="space-y-2">
            {DAILY_GOALS.map(g => (
              <div key={g.label} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">{g.label}</span>
                <span className="text-xs font-bold text-orange-500">+{g.pts} pts</span>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
            <TrendingUp className="w-4 h-4 text-orange-500" />
            Ranking de Entregadores
          </h3>

          {leaderboard.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">Nenhum dado disponível ainda.</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((user, i) => {
                const medal = i === 0 ? 'bg-yellow-400 text-yellow-900'
                  : i === 1 ? 'bg-slate-300 text-slate-700'
                  : i === 2 ? 'bg-amber-600 text-white'
                  : 'bg-gray-100 text-gray-500';
                return (
                  <div key={user.user_id || i} className="flex items-center gap-3 py-1.5">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${medal}`}>
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm text-gray-700 font-medium truncate">
                      {user.name || user.display_name || user.full_name || 'Entregador'}
                    </span>
                    <span className="text-sm font-bold text-orange-600 tabular-nums">
                      {(user.total_points || 0).toLocaleString('pt-BR')} pts
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
