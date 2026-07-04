// src/pages/GamificationPage.jsx — Gamificação completa

import React, { useState, useEffect, useCallback } from 'react';
import {
  Trophy, TrendingUp, Target, Star, Zap,
  Loader2, AlertCircle, Gift, Clock, CheckCircle,
  Package, BarChart2
} from 'lucide-react';
import { DELIVERY_API_URL, createAuthHeaders, processResponse } from '../services/api';
import { useProfile } from '../context/DeliveryProfileContext';
import { useToast } from '../context/ToastContext';

// ─── Constantes ──────────────────────────────────────────────────────────────

const LEVELS = [
  { min: 0,    max: 299,  name: 'Bronze',  gradient: 'from-amber-400 to-amber-600'   },
  { min: 300,  max: 799,  name: 'Prata',   gradient: 'from-slate-300 to-slate-500'   },
  { min: 800,  max: 1499, name: 'Ouro',    gradient: 'from-yellow-400 to-yellow-600' },
  { min: 1500, max: 2999, name: 'Platina', gradient: 'from-cyan-400 to-cyan-600'     },
  { min: 3000, max: Infinity, name: 'Diamante', gradient: 'from-purple-400 to-purple-600' },
];

function resolveLevel(totalPoints) {
  const pts = totalPoints || 0;
  return LEVELS.find(l => pts >= l.min && pts <= l.max) || LEVELS[0];
}

function calcProgress(totalPoints, levelObj) {
  if (levelObj.max === Infinity) return 100;
  const range = levelObj.max - levelObj.min + 1;
  const done  = totalPoints - levelObj.min;
  return Math.max(4, Math.min(100, Math.round((done / range) * 100)));
}

const LEADERBOARD_TABS = [
  { key: 'points',     label: 'Por Pontos',     icon: Trophy    },
  { key: 'deliveries', label: 'Por Entregas',   icon: Package   },
  { key: 'efficiency', label: 'Por Eficiência', icon: BarChart2 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysRemaining(deadline) {
  if (!deadline) return null;
  const diff = Math.ceil((new Date(deadline) - Date.now()) / 86_400_000);
  if (diff <= 0) return 'Vence hoje';
  if (diff === 1) return '1 dia restante';
  return `${diff} dias restantes`;
}

function pct(current, goal) {
  if (!goal || goal <= 0) return 0;
  return Math.min(100, Math.round((current / goal) * 100));
}

// ─── Subcomponentes ──────────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, color, children }) {
  return (
    <h3 className={`font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide`}>
      <Icon className={`w-4 h-4 ${color}`} />
      {children}
    </h3>
  );
}

function ProgressBar({ value, colorClass = 'bg-orange-500' }) {
  return (
    <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
      <div
        className={`${colorClass} h-2 rounded-full transition-all duration-700 ease-out`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-4 pb-12">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="h-7 bg-gray-200 rounded-lg w-1/2 mx-auto animate-pulse" />
        <div className="h-44 bg-gray-200 rounded-2xl animate-pulse" />
        <div className="h-36 bg-gray-200 rounded-xl animate-pulse" />
        <div className="h-52 bg-gray-200 rounded-xl animate-pulse" />
        <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
        <div className="h-44 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

// ─── Seção: Card de Pontos e Nível ──────────────────────────────────────────

function LevelCard({ userPoints }) {
  const total     = userPoints?.total_points ?? 0;
  const deliveries= userPoints?.total_deliveries ?? 0;
  const levelObj  = resolveLevel(total);
  const progress  = calcProgress(total, levelObj);
  const toNext    = levelObj.max === Infinity ? 0 : levelObj.max - total + 1;

  return (
    <div className={`rounded-2xl bg-gradient-to-br ${levelObj.gradient} p-4 sm:p-6 text-white shadow-xl`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-white/70 text-xs uppercase tracking-widest mb-1">Nível atual</p>
          <h2 className="text-3xl font-black">{userPoints?.level_name || levelObj.name}</h2>
        </div>
        <div className="bg-white/20 rounded-full p-3">
          <Trophy className="w-8 h-8 text-white" />
        </div>
      </div>

      <p className="text-4xl sm:text-5xl font-black tabular-nums">{total.toLocaleString('pt-BR')}</p>
      <p className="text-white/70 text-sm mb-1">pontos acumulados</p>
      <p className="text-white/80 text-sm mb-4">
        <Package className="inline w-3.5 h-3.5 mr-1 opacity-70" />
        {deliveries.toLocaleString('pt-BR')} entregas realizadas
      </p>

      {toNext > 0 ? (
        <>
          <div className="bg-black/20 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-white h-2.5 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-white/70 text-xs mt-2">
            {toNext.toLocaleString('pt-BR')} pts para o próximo nível · {progress}% concluído
          </p>
        </>
      ) : (
        <p className="text-white/80 text-sm font-semibold">Nível máximo atingido!</p>
      )}
    </div>
  );
}

// ─── Seção: Ranking ──────────────────────────────────────────────────────────

function LeaderboardSection({ currentUserId }) {
  const [activeTab, setActiveTab] = useState('points');
  const [data, setData]           = useState({});
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  const fetchTab = useCallback(async (type) => {
    setLoading(true);
    setError(null);
    try {
      // Nota: "type" aqui e a aba local (points/deliveries/efficiency) usada so
      // pra exibir a coluna certa -- o backend nao ordena por ela, so por pontos.
      const res = await fetch(
        `${DELIVERY_API_URL}/api/gamification/leaderboard?scope=delivery&limit=10`,
        { headers: createAuthHeaders() }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      // Backend responde {status, data:{items:[...], limit}} -- "items", nao "users".
      const users = json.data?.items ?? json.items ?? [];
      setData(prev => ({ ...prev, [type]: Array.isArray(users) ? users : [] }));
    } catch (err) {
      setError('Não foi possível carregar o ranking.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!data[activeTab]) fetchTab(activeTab);
  }, [activeTab, data, fetchTab]);

  const list = data[activeTab] || [];

  const medalClass = (i) => {
    if (i === 0) return 'bg-yellow-400 text-yellow-900';
    if (i === 1) return 'bg-slate-300 text-slate-700';
    if (i === 2) return 'bg-amber-600 text-white';
    return 'bg-gray-100 text-gray-500';
  };

  const statLabel = { points: 'pts', deliveries: 'entregas', efficiency: '%' };

  const statValue = (user) => {
    if (activeTab === 'points')     return (user.total_points ?? 0).toLocaleString('pt-BR');
    if (activeTab === 'deliveries') return (user.total_deliveries ?? 0).toLocaleString('pt-BR');
    if (activeTab === 'efficiency') return `${(user.efficiency_rate ?? 0).toFixed(1)}%`;
    return '—';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <SectionTitle icon={TrendingUp} color="text-orange-500">Ranking de Entregadores</SectionTitle>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
        {LEADERBOARD_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === key
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-6">
          <Loader2 className="animate-spin w-6 h-6 text-orange-400" />
        </div>
      )}

      {error && !loading && (
        <p className="text-center text-red-500 text-sm py-4">{error}</p>
      )}

      {!loading && !error && list.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-6">Nenhum dado disponível ainda.</p>
      )}

      {!loading && !error && list.length > 0 && (
        <div className="space-y-1.5">
          {list.map((user, i) => {
            const isMe = user.user_id === currentUserId || user.id === currentUserId;
            return (
              <div
                key={user.user_id || user.id || i}
                className={`flex items-center gap-3 py-2 px-2 rounded-lg ${isMe ? 'bg-orange-50 border border-orange-200' : ''}`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${medalClass(i)}`}>
                  {i + 1}
                </span>
                <span className={`flex-1 text-sm font-medium truncate ${isMe ? 'text-orange-700' : 'text-gray-700'}`}>
                  {user.name || user.display_name || user.full_name || 'Entregador'}
                  {isMe && <span className="ml-1 text-xs text-orange-500">(você)</span>}
                </span>
                <span className={`text-sm font-bold tabular-nums ${isMe ? 'text-orange-600' : 'text-gray-600'}`}>
                  {statValue(user)} <span className="text-xs font-normal text-gray-400">{statLabel[activeTab]}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Seção: Desafios ─────────────────────────────────────────────────────────

function ChallengesSection({ userId }) {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${DELIVERY_API_URL}/api/challenges/user/${userId}`,
          { headers: createAuthHeaders() }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list = json.data ?? json.challenges ?? json ?? [];
        setChallenges(Array.isArray(list) ? list : []);
      } catch (err) {
        setError('Não foi possível carregar os desafios.');
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const badgeClass = (type) => {
    if (type === 'daily')  return 'bg-blue-100 text-blue-700';
    if (type === 'weekly') return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-600';
  };

  const badgeLabel = (type) => {
    if (type === 'daily')  return 'Diário';
    if (type === 'weekly') return 'Semanal';
    return type ?? 'Desafio';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <SectionTitle icon={Target} color="text-green-500">Desafios</SectionTitle>

      {loading && (
        <div className="flex justify-center py-6">
          <Loader2 className="animate-spin w-6 h-6 text-green-400" />
        </div>
      )}

      {error && !loading && (
        <p className="text-center text-red-500 text-sm py-4">{error}</p>
      )}

      {!loading && !error && challenges.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-6">Nenhum desafio ativo no momento.</p>
      )}

      {!loading && !error && challenges.length > 0 && (
        <div className="space-y-4">
          {challenges.map((ch, i) => {
            const current  = ch.current_progress ?? ch.progress ?? 0;
            const goal     = ch.goal ?? ch.target ?? 1;
            const done     = ch.completed || ch.is_completed || current >= goal;
            const progress = pct(current, goal);
            const deadline = daysRemaining(ch.deadline ?? ch.expires_at);

            return (
              <div key={ch.id || i} className={`border rounded-lg p-3 ${done ? 'bg-green-50 border-green-200' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between mb-1.5 gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeClass(ch.challenge_type ?? ch.type)}`}>
                        {badgeLabel(ch.challenge_type ?? ch.type)}
                      </span>
                      {done && <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
                    </div>
                    <p className="text-sm font-semibold text-gray-800 leading-tight">{ch.name ?? ch.title ?? 'Desafio'}</p>
                    {ch.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{ch.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-orange-600">+{(ch.reward_points ?? ch.points ?? 0)} pts</p>
                    {deadline && !done && (
                      <p className={`text-xs ${deadline === 'Vence hoje' ? 'text-red-500 font-semibold' : 'text-gray-400'} flex items-center gap-1 justify-end mt-0.5`}>
                        <Clock className="w-3 h-3" />
                        {deadline}
                      </p>
                    )}
                  </div>
                </div>
                <ProgressBar value={progress} colorClass={done ? 'bg-green-500' : 'bg-orange-500'} />
                <p className="text-xs text-gray-400 mt-1">
                  {current.toLocaleString('pt-BR')} / {goal.toLocaleString('pt-BR')} · {progress}%
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Seção: Loja de Recompensas ──────────────────────────────────────────────

const REWARD_TYPE_LABELS = {
  gift: 'Brinde', discount_pct: 'Desconto', free_delivery: 'Frete Grátis', credit: 'Crédito',
};
const REWARD_TYPE_COLORS = {
  gift: 'bg-purple-100 text-purple-700', discount_pct: 'bg-green-100 text-green-700',
  free_delivery: 'bg-blue-100 text-blue-700', credit: 'bg-amber-100 text-amber-700',
};

function RewardsSection({ userPoints, onPointsRefresh }) {
  const addToast = useToast();
  const { profile } = useProfile();
  const [rewards, setRewards]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [redeeming, setRedeeming]     = useState(null);
  const [confirmReward, setConfirmReward] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${DELIVERY_API_URL}/api/gamification/rewards?audience=delivery`,
          { headers: createAuthHeaders() }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list = json.data?.items ?? json.data ?? json.items ?? json ?? [];
        setRewards(Array.isArray(list) ? list : []);
      } catch {
        setError('Não foi possível carregar a loja de recompensas.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const total = userPoints?.total_points ?? 0;
  const userId = profile?.id ?? profile?.user_id;
  const userName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name ?? ''}`.trim()
    : profile?.name ?? '';

  const handleRedeemRequest = (r) => {
    const cost = r.points_required ?? r.cost_points ?? r.points_cost ?? 0;
    if (total < cost) {
      addToast(`Pontos insuficientes. Você tem ${total.toLocaleString('pt-BR')} pts, precisa de ${cost.toLocaleString('pt-BR')} pts.`, 'error');
      return;
    }
    setConfirmReward(r);
  };

  const handleRedeemConfirm = async () => {
    if (!confirmReward) return;
    const r = confirmReward;
    setConfirmReward(null);
    setRedeeming(r.id);
    const cost = r.points_required ?? r.cost_points ?? r.points_cost ?? 0;
    try {
      const res = await fetch(`${DELIVERY_API_URL}/api/gamification/rewards/${r.id}/redeem`, {
        method: 'POST',
        headers: { ...createAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, user_type: 'delivery', user_name: userName, points_used: cost }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || `Erro HTTP ${res.status}`);
      }
      const json = await res.json();
      addToast(json.data?.message ?? `"${r.name}" resgatado!`, 'success');
      onPointsRefresh?.();
    } catch (err) {
      addToast(err.message || 'Erro ao resgatar recompensa.', 'error');
    } finally {
      setRedeeming(null);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <SectionTitle icon={Gift} color="text-purple-500">Loja de Recompensas</SectionTitle>

        {loading && (
          <div className="flex justify-center py-6">
            <Loader2 className="animate-spin w-6 h-6 text-purple-400" />
          </div>
        )}
        {error && !loading && (
          <p className="text-center text-red-500 text-sm py-4">{error}</p>
        )}
        {!loading && !error && rewards.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-6">Nenhuma recompensa disponível no momento.</p>
        )}

        {!loading && !error && rewards.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rewards.map((r, i) => {
              const cost      = r.points_required ?? r.cost_points ?? r.points_cost ?? 0;
              const canAfford = total >= cost;
              const isLoading = redeeming === r.id;
              const progress  = cost > 0 ? Math.min(100, Math.round((total / cost) * 100)) : 100;
              const isEmoji   = r.icon && !/^https?:\/\//.test(r.icon);
              const lowStock  = r.stock != null && r.stock < 10;

              return (
                <div
                  key={r.id || i}
                  className={`border rounded-xl p-4 flex flex-col gap-3 transition-all hover:shadow-md ${
                    canAfford ? 'border-purple-200 bg-purple-50/30' : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  {/* Icon + name */}
                  <div className="flex items-start gap-3">
                    {r.image_url ? (
                      <img src={r.image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                    ) : r.icon ? (
                      isEmoji
                        ? <span className="text-4xl leading-none shrink-0">{r.icon}</span>
                        : <img src={r.icon} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                        <Gift className="w-6 h-6 text-purple-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-800 leading-tight">{r.name ?? r.title ?? 'Recompensa'}</p>
                      {r.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {r.reward_type && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${REWARD_TYPE_COLORS[r.reward_type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {REWARD_TYPE_LABELS[r.reward_type] ?? r.reward_type}
                      </span>
                    )}
                    {lowStock && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                        Estoque: {r.stock}
                      </span>
                    )}
                  </div>

                  {/* Points + progress */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`flex items-center gap-1 text-sm font-bold ${canAfford ? 'text-purple-700' : 'text-gray-400'}`}>
                        ⭐ {cost.toLocaleString('pt-BR')} pts
                      </span>
                      <span className="text-xs text-gray-400">{progress}%</span>
                    </div>
                    <ProgressBar value={progress} colorClass={canAfford ? 'bg-green-500' : 'bg-purple-400'} />
                    {!canAfford && (
                      <p className="text-xs text-gray-400 mt-1">
                        Faltam {(cost - total).toLocaleString('pt-BR')} pontos
                      </p>
                    )}
                  </div>

                  {/* Button */}
                  <button
                    onClick={() => !isLoading && handleRedeemRequest(r)}
                    disabled={isLoading}
                    className={`w-full min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1 mt-auto ${
                      canAfford && !isLoading
                        ? 'bg-green-500 hover:bg-green-600 text-white'
                        : !canAfford
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {isLoading ? 'Resgatando…' : canAfford ? 'Resgatar' : 'Pontos insuficientes'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de confirmação */}
      {confirmReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="text-5xl mb-3">
              {confirmReward.icon && !/^https?:\/\//.test(confirmReward.icon)
                ? confirmReward.icon : '🎁'}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">{confirmReward.name}</h3>
            <p className="text-sm text-gray-500 mb-4">
              Você usará{' '}
              <span className="font-bold text-orange-500">
                {(confirmReward.points_required ?? confirmReward.cost_points ?? 0).toLocaleString('pt-BR')} pontos
              </span>{' '}
              para resgatar esta recompensa.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmReward(null)}
                className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50 transition font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleRedeemConfirm}
                className="flex-1 px-4 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded-full font-bold transition"
              >
                Confirmar resgate
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Seção: Histórico de Pontos ──────────────────────────────────────────────

function PointsHistorySection({ history }) {
  const [expanded, setExpanded] = useState(false);

  if (!history || history.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <SectionTitle icon={Star} color="text-yellow-500">Histórico de Pontos</SectionTitle>
        <p className="text-center text-gray-400 text-sm py-4">Nenhum registro ainda.</p>
      </div>
    );
  }

  const shown = expanded ? history : history.slice(0, 5);

  const formatDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
    catch { return d; }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <SectionTitle icon={Star} color="text-yellow-500">Histórico de Pontos</SectionTitle>

      <div className="divide-y divide-gray-50">
        {shown.map((item, i) => (
          <div key={item.id || i} className="flex items-center justify-between py-2.5 gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-700 font-medium truncate">
                {item.description ?? item.action ?? item.reason ?? 'Entrega concluída'}
              </p>
              <p className="text-xs text-gray-400">{formatDate(item.created_at ?? item.date)}</p>
            </div>
            <span className="text-sm font-bold text-green-600 tabular-nums shrink-0">
              +{(item.points ?? item.points_earned ?? 0).toLocaleString('pt-BR')} pts
            </span>
          </div>
        ))}
      </div>

      {history.length > 5 && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-3 w-full text-xs text-orange-500 hover:text-orange-600 font-semibold py-1"
        >
          {expanded ? 'Ver menos' : `Ver mais ${history.length - 5} registros`}
        </button>
      )}
    </div>
  );
}

// ─── Seção: Como ganhar pontos (busca as regras reais do admin) ─────────────

function HowToEarnSection() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${DELIVERY_API_URL}/api/gamification/point-rules?applies_to=delivery`, {
          headers: createAuthHeaders(),
        });
        const json = await processResponse(res);
        if (alive) setRules(json?.data?.items ?? json?.items ?? []);
      } catch {
        if (alive) setRules([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <SectionTitle icon={Zap} color="text-orange-500">Como ganhar pontos</SectionTitle>
      {loading ? (
        <p className="text-sm text-gray-400 py-2">Carregando...</p>
      ) : rules.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">Nenhuma regra disponível no momento.</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {rules.map((rule) => (
            <div key={rule.action_key} className="flex justify-between items-center py-2.5">
              <span className="text-sm text-gray-600">{rule.label}</span>
              <span className="text-sm font-bold text-green-600">+{rule.points}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function GamificationPage() {
  const { profile, loading: profileLoading } = useProfile();
  const addToast = useToast();

  const [userPoints, setUserPoints] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const userId = profile?.id ?? profile?.user_id ?? null;

  const fetchUserPoints = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${DELIVERY_API_URL}/api/gamification/user-points/${userId}`,
        { headers: createAuthHeaders() }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setUserPoints(json.data ?? json);
    } catch (err) {
      setError(err.message || 'Não foi possível carregar seus pontos.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!profileLoading) fetchUserPoints();
  }, [fetchUserPoints, profileLoading]);

  // ── Estados de carregamento / erro ─────────────────────────────────────────

  if (profileLoading || loading) return <Skeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 gap-4 p-6">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-red-600 font-medium text-center max-w-sm">{error}</p>
        <button
          onClick={fetchUserPoints}
          className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  const history = userPoints?.history ?? userPoints?.points_history ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-4 pb-12">
      <div className="max-w-lg mx-auto space-y-4 sm:space-y-5">

        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 text-center pt-2">
          Minha Gamificação
        </h1>

        {/* 1. Card de Pontos e Nível */}
        <LevelCard userPoints={userPoints} />

        {/* 2. Como ganhar pontos */}
        <HowToEarnSection />

        {/* 3. Desafios Diários e Semanais */}
        {userId && <ChallengesSection userId={userId} />}

        {/* 4. Ranking */}
        <LeaderboardSection currentUserId={userId} />

        {/* 5. Loja de Recompensas */}
        <RewardsSection userPoints={userPoints} onPointsRefresh={fetchUserPoints} />

        {/* 6. Histórico de Pontos */}
        <PointsHistorySection history={history} />

      </div>
    </div>
  );
}
