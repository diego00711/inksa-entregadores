import React from 'react';
import { TrendingUp, Clock, Route, Star, Wallet, Truck } from 'lucide-react';

/**
 * Painel do dia do entregador.
 *
 * ── POR QUE ELE NÃO É "QUATRO CARTÕES BONITINHOS" ──────────────────────────
 *
 * A tela anterior tinha quatro cartões de gradiente, todos do mesmo tamanho.
 * Quatro coisas com o mesmo peso é o mesmo que nenhuma em destaque: o olho não
 * sabe onde pousar, e a tela parece cheia sem informar. Os subtítulos ainda
 * eram frases de enfeite ("Continue assim!", "Muito bom!") — e o "Muito bom!"
 * aparecia embaixo de uma avaliação ZERO, o que é pior que não escrever nada.
 *
 * Esta tela tem UM trabalho quando o entregador abre: responder "quanto eu fiz
 * hoje e quanto falta pra minha meta". Todo o resto é secundário e foi tratado
 * como secundário.
 *
 * ── A ESCOLHA DO ESCURO ────────────────────────────────────────────────────
 *
 * Painel escuro não é moda: é o painel de um veículo, que é onde essa pessoa
 * está. Some com o brilho no sol, faz o número do dinheiro saltar, e à noite
 * (que é quando o delivery acontece) não cega. O resto da tela fica claro, e o
 * contraste sozinho já cria a hierarquia que os quatro cartões não tinham.
 *
 * ── O QUE NÃO ENTROU, DE PROPÓSITO ─────────────────────────────────────────
 *
 * O backend devolve `ranking`, `streak` e `peakHours`, e eu NÃO uso nenhum:
 *   - ranking e streak são inicializados em 0 e nunca calculados;
 *   - peakHours é fixo no código ("11:30-13:30, bônus 1.5x") — a plataforma
 *     não tem bônus por horário nenhum.
 * Mostrar isso seria desenhar dado que não existe, e o entregador confia no
 * número. Quando forem calculados de verdade, cabem aqui sem redesenho.
 */

const brl = (v) => Number(v || 0).toFixed(2).replace('.', ',');

// Altura útil do gráfico da semana, em pixels. É a régua contra a qual cada
// barra é calculada — ver o comentário dentro de <Semana>.
const ALTURA_GRAFICO = 88;

/* Barra de progresso da meta. Verde só quando bateu — antes disso é laranja da
   marca, porque "quase lá" não é "conseguiu". */
function BarraDaMeta({ pct, bateu }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className={`h-full rounded-full transition-[width] duration-700 ease-out ${
          bateu ? 'bg-emerald-400' : 'bg-[#FF6F00]'
        }`}
        style={{ width: `${Math.max(pct, 2)}%` }}
      />
    </div>
  );
}

/* Métrica pequena dentro do painel escuro. */
function Medida({ icone: Icone, valor, rotulo }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center gap-1.5 text-white/40">
        <Icone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate text-[10px] font-bold uppercase tracking-wider">{rotulo}</span>
      </div>
      <p className="truncate text-lg font-bold tabular-nums text-white">{valor}</p>
    </div>
  );
}

/**
 * Gráfico da semana. Dado REAL (`weeklyEarnings` já vem pronto do backend e
 * nunca era mostrado).
 *
 * Barra de dia sem ganho fica como um traço, não some: uma semana com buraco
 * conta uma história — a ausência é informação. Barras somem, o eixo vira
 * mentira.
 */
function Semana({ dados }) {
  const dias = Array.isArray(dados) ? dados : [];
  if (dias.length === 0) return null;
  const teto = Math.max(...dias.map((d) => Number(d?.value) || 0), 1);
  const total = dias.reduce((s, d) => s + (Number(d?.value) || 0), 0);
  const hoje = new Date().getDay(); // 0=dom … 6=sáb
  // O backend monta a semana começando na SEGUNDA; getDay() começa no domingo.
  const indiceHoje = hoje === 0 ? 6 : hoje - 1;

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold text-gray-800">Sua semana</h2>
        <p className="text-sm font-bold tabular-nums text-gray-900">R$ {brl(total)}</p>
      </div>
      {/* ⚠️ ALTURA DA BARRA EM PIXEL, NÃO EM PORCENTAGEM.
          A primeira versão usava `height: X%` numa barra dentro de um wrapper
          `flex-1`. Altura percentual só resolve contra um pai de altura
          DEFINIDA, e `flex-1` não é altura definida — o resultado é barra com
          altura zero: o gráfico aparecia vazio, com os rótulos embaixo, e
          parecia "sem dados" em vez de quebrado. Peguei renderizando a prévia
          antes de subir.
          Aqui a régua (ALTURA_GRAFICO) é o número, e cada barra recebe pixels
          calculados dela. Não depende de o CSS resolver nada. */}
      <div className="flex items-end justify-between gap-1.5" style={{ height: ALTURA_GRAFICO }}>
        {dias.map((d, i) => {
          const v = Number(d?.value) || 0;
          const ehHoje = i === indiceHoje;
          // Dia sem ganho vira um traço de 3px em vez de sumir: uma semana com
          // buraco conta uma história, e barra ausente faria o eixo mentir.
          const altura = v > 0
            ? Math.max(Math.round((v / teto) * ALTURA_GRAFICO), 6)
            : 3;
          return (
            <div key={`${d?.day}-${i}`} className="flex h-full min-w-0 flex-1 flex-col justify-end">
              <div
                className={`w-full rounded-t transition-[height] duration-500 ${
                  ehHoje ? 'bg-[#FF6F00]' : v > 0 ? 'bg-orange-200' : 'bg-gray-200'
                }`}
                style={{ height: `${altura}px` }}
                title={`${d?.day}: R$ ${brl(v)}`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between gap-1.5">
        {dias.map((d, i) => (
          <span
            key={`rot-${d?.day}-${i}`}
            className={`min-w-0 flex-1 text-center text-[10px] font-bold ${
              i === indiceHoje ? 'text-[#FF6F00]' : 'text-gray-400'
            }`}
          >
            {String(d?.day || '').slice(0, 3)}
          </span>
        ))}
      </div>
    </section>
  );
}

export default function PainelDoDia({
  ganhosHoje = 0,
  meta = 0,
  entregasHoje = 0,
  minutosOnline = 0,
  distanciaHoje = 0,
  avaliacao = 0,
  totalEntregas = 0,
  semana = [],
  proximoPagamento = null,
}) {
  const pct = meta > 0 ? Math.min((ganhosHoje / meta) * 100, 100) : 0;
  const bateu = meta > 0 && ganhosHoje >= meta;
  const falta = Math.max(meta - ganhosHoje, 0);
  const horas = Math.floor(minutosOnline / 60);
  const mins = minutosOnline % 60;

  return (
    <div className="mb-6 space-y-4">
      {/* ── PAINEL ESCURO: o número que a pessoa abriu o app pra ver ──────── */}
      <section className="relative overflow-hidden rounded-3xl bg-[#12151A] p-5 shadow-xl">
        {/* Brilho quente no canto: dá profundidade sem virar gradiente de
            cartão genérico. Fica atrás do conteúdo e não atrapalha leitura. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle, #FF6F00 0%, transparent 70%)' }}
        />

        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">
            Ganhos de hoje
          </p>
          <p className="mt-1 flex items-baseline gap-1.5 text-white">
            <span className="text-2xl font-bold text-white/50">R$</span>
            <span className="text-[44px] font-black leading-none tabular-nums">
              {brl(ganhosHoje)}
            </span>
          </p>

          {meta > 0 && (
            <div className="mt-4">
              <div className="mb-2 flex items-baseline justify-between gap-2 text-xs">
                <span className="font-semibold text-white/55">
                  Meta R$ {brl(meta)}
                </span>
                <span className={`font-bold tabular-nums ${bateu ? 'text-emerald-400' : 'text-white/80'}`}>
                  {bateu ? 'Meta batida ✓' : `faltam R$ ${brl(falta)}`}
                </span>
              </div>
              <BarraDaMeta pct={pct} bateu={bateu} />
            </div>
          )}

          {/* Três medidas do dia. Distância entra aqui: o backend já calculava
              e nenhuma tela mostrava. */}
          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
            <Medida icone={Truck} rotulo="Entregas" valor={entregasHoje} />
            <Medida icone={Clock} rotulo="Online" valor={`${horas}h ${String(mins).padStart(2, '0')}`} />
            <Medida
              icone={Route}
              rotulo="Rodou"
              valor={`${Number(distanciaHoje || 0).toFixed(1).replace('.', ',')} km`}
            />
          </div>
        </div>
      </section>

      <Semana dados={semana} />

      <div className="grid grid-cols-2 gap-4">
        {/* Avaliação SEM elogio automático. O texto de antes dizia "Muito bom!"
            embaixo de uma nota zero. Sem avaliação ainda, diz isso. */}
        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-1 flex items-center gap-1.5 text-gray-400">
            <Star className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Avaliação</span>
          </div>
          {avaliacao > 0 ? (
            <>
              <p className="text-2xl font-bold tabular-nums text-gray-900">
                {avaliacao.toFixed(1)}
                <span className="ml-0.5 text-lg text-amber-400">★</span>
              </p>
              <p className="mt-0.5 text-[11px] text-gray-400">
                {totalEntregas} {totalEntregas === 1 ? 'entrega' : 'entregas'} no total
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-300">—</p>
              <p className="mt-0.5 text-[11px] text-gray-400">Ainda sem avaliações</p>
            </>
          )}
        </section>

        {/* Próximo pagamento: outro dado que o backend já buscava e ninguém
            mostrava. É a pergunta nº 2 de quem trabalha por entrega. */}
        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-1 flex items-center gap-1.5 text-gray-400">
            <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-[10px] font-bold uppercase tracking-wider">A receber</span>
          </div>
          {proximoPagamento && Number(proximoPagamento.amount) > 0 ? (
            <>
              <p className="text-2xl font-bold tabular-nums text-emerald-600">
                R$ {brl(proximoPagamento.amount)}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-400">em {proximoPagamento.date}</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-300">—</p>
              <p className="mt-0.5 text-[11px] text-gray-400">Nada agendado</p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
