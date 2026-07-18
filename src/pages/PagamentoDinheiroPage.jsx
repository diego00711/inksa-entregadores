import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Banknote,
  HandCoins,
  Wallet,
  CalendarClock,
  CheckCircle2,
  Lightbulb,
  LifeBuoy,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import DeliveryService from '../services/deliveryService';

const brl = (v) =>
  (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Passo a passo do fluxo do dinheiro — a mesma lógica do backend
// (delivery_orders confirma o recebimento e soma cash_debt; o repasse
// semanal abate esse débito do valor online e paga a diferença por PIX).
const STEPS = [
  {
    icon: Banknote,
    title: 'Você recebe o valor cheio',
    text: 'Na entrega, o cliente te paga o total do pedido em dinheiro, direto na sua mão.',
  },
  {
    icon: HandCoins,
    title: 'Sua parte já fica com você',
    text: 'O valor da sua entrega (o frete) já sai desse dinheiro na hora. Você não espera repasse pra receber essa parte.',
  },
  {
    icon: Wallet,
    title: 'O restante vira um saldo a acertar',
    text: 'A parte do restaurante e da Inksa fica registrada como um saldo seu com a plataforma. Você NÃO precisa transferir nada na hora.',
  },
  {
    icon: CalendarClock,
    title: 'Acerta tudo no repasse semanal',
    text: 'Toda semana a Inksa desconta esse saldo do que ela te paga pelas entregas online (PIX/cartão) e te envia só a diferença por PIX.',
  },
];

const FAQ = [
  {
    q: 'E se eu receber mais em dinheiro do que em pedidos online?',
    a: 'Sem problema. O que faltar do saldo passa pro próximo repasse. Você nunca fica "no vermelho" nem recebe uma cobrança avulsa — sempre acerta descontando dos próximos repasses.',
  },
  {
    q: 'Preciso separar o dinheiro?',
    a: 'A parte do restaurante e da Inksa não é sua — o ideal é não misturar com seus gastos, porque ela vai ser descontada do seu próximo PIX. Só o valor da sua entrega é seu de fato.',
  },
  {
    q: 'Onde eu vejo quanto tenho pra acertar?',
    a: 'No seu Início (Dashboard), no bloco "Dinheiro em mãos". Ele mostra quanto você recebeu em dinheiro e quanto ainda está como débito com a plataforma.',
  },
];

function Step({ index, icon: Icon, title, text }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        {index < STEPS.length - 1 && <div className="w-0.5 flex-1 bg-orange-100 my-1" />}
      </div>
      <div className="pb-5">
        <p className="font-semibold text-gray-900 leading-tight">
          <span className="text-orange-500 font-bold mr-1">{index + 1}.</span>
          {title}
        </p>
        <p className="text-sm text-gray-600 mt-1">{text}</p>
      </div>
    </div>
  );
}

export default function PagamentoDinheiroPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    DeliveryService.getDashboardStats()
      .then((d) => { if (alive) setStats(d); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const cashDebt = Number(stats?.cashDebt) || 0;
  const cashReceived = Number(stats?.totalCashReceived) || 0;
  const emDia = cashDebt <= 0;

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100 text-gray-600"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Pagamento em Dinheiro</h1>
      </div>
      <p className="text-sm text-gray-500 -mt-2">
        Como funciona quando o cliente paga em dinheiro na hora da entrega.
      </p>

      {/* Saldo ao vivo do entregador */}
      <div
        className={`rounded-2xl p-5 text-white shadow-xl bg-gradient-to-r ${
          emDia ? 'from-emerald-500 to-green-600' : 'from-yellow-500 to-orange-500'
        }`}
      >
        {loading ? (
          <div className="flex items-center gap-2 text-white/90">
            <Loader2 className="w-5 h-5 animate-spin" /> Carregando seu saldo…
          </div>
        ) : emDia ? (
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 shrink-0" />
            <div>
              <p className="font-bold text-base">Você está em dia! 🎉</p>
              <p className="text-sm text-white/85">
                Nenhum saldo em dinheiro pra acertar no momento.
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs text-white/80 mb-0.5">Seu saldo a acertar agora</p>
            <p className="text-3xl font-black">{brl(cashDebt)}</p>
            <p className="text-xs text-white/80 mt-2">
              Já recolhido em dinheiro: {brl(cashReceived)} · esse saldo será descontado do
              seu próximo repasse por PIX.
            </p>
          </>
        )}
      </div>

      {/* Passo a passo */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Passo a passo</h2>
        <div>
          {STEPS.map((s, i) => (
            <Step key={s.title} index={i} icon={s.icon} title={s.title} text={s.text} />
          ))}
        </div>
      </div>

      {/* Exemplo prático */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-800 mb-3">Um exemplo prático</h2>
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between gap-3 border-b border-dashed border-gray-200 pb-2">
            <span className="text-gray-600">Pedido pago em dinheiro</span>
            <span className="font-semibold text-gray-900">{brl(50)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-gray-600">↳ A sua taxa de entrega (fica com você na hora)</span>
            <span className="font-semibold text-emerald-600">{brl(8)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-gray-600">↳ Saldo a acertar (restaurante + Inksa)</span>
            <span className="font-semibold text-orange-600">{brl(42)}</span>
          </div>
          <div className="mt-2 rounded-lg bg-gray-50 p-3 space-y-2">
            <p className="text-xs text-gray-500 font-medium">No repasse da semana:</p>
            <div className="flex justify-between gap-3">
              <span className="text-gray-600">Suas entregas online (a receber)</span>
              <span className="font-semibold text-gray-900">{brl(100)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-600">− Saldo do dinheiro</span>
              <span className="font-semibold text-orange-600">− {brl(42)}</span>
            </div>
            <div className="flex justify-between gap-3 border-t border-gray-200 pt-2">
              <span className="font-semibold text-gray-800">= Você recebe por PIX</span>
              <span className="font-bold text-emerald-600 text-base">{brl(58)}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 pt-1">
            No fim, você ganhou <strong>{brl(8)}</strong> em mãos +{' '}
            <strong>{brl(58)}</strong> no PIX = <strong>{brl(66)}</strong>, e o saldo zera. ✅
          </p>
        </div>
      </div>

      {/* Perguntas frequentes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
        <div className="p-4"><h2 className="font-semibold text-gray-800">Perguntas frequentes</h2></div>
        {FAQ.map((f) => (
          <details key={f.q} className="group px-4 py-3">
            <summary className="flex items-center justify-between cursor-pointer list-none text-sm font-medium text-gray-800">
              {f.q}
              <ArrowRight className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90" />
            </summary>
            <p className="text-sm text-gray-600 mt-2">{f.a}</p>
          </details>
        ))}
      </div>

      {/* Dica */}
      <div className="flex gap-3 rounded-xl bg-amber-50 border border-amber-100 p-4">
        <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-900">
          <strong>Dica:</strong> assim que receber um pedido em dinheiro, separe a parte que não
          é sua. Como ela é descontada do seu repasse, guardar esse valor evita aperto no fim
          da semana.
        </p>
      </div>

      {/* Suporte */}
      <Link
        to="/delivery/suporte"
        className="flex items-center justify-center gap-2 text-sm font-medium text-orange-600 hover:underline py-2"
      >
        <LifeBuoy className="w-4 h-4" /> Ainda com dúvidas? Fale com o suporte
      </Link>
    </div>
  );
}
