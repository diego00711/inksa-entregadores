// "Quem você acha que deveria receber?"
//
// O Dia I doa todo o lucro da plataforma para uma causa da cidade. Até aqui
// quem escolhia o destino era o escritório. Ideia do Diego (21/08/2026):
// deixar a cidade indicar.
//
// A diferença não é enquete, é vínculo. Quem indicou a creche da própria rua
// acompanha o Dia I de um jeito que quem só viu o banner não acompanha — e
// conta pros outros. É a única parte do app em que o usuário pede algo que
// não é pra ele.
//
// A JANELA ABRE MUITO ANTES DO EVENTO, de propósito. Chegar no Dia I ainda
// decidindo o destino é chegar tarde: não dá tempo de falar com a instituição
// nem de combinar a entrega. O admin abre cerca de um mês antes.
//
// UMA INDICAÇÃO POR PESSOA. Indicar de novo TROCA a sua, não soma outra — o
// banco garante isso com índice único no usuário. Trocar é permitido de
// propósito: quem digitou errado ou mudou de ideia não pode ficar preso a uma
// indicação errada pra sempre. O que não pode é uma pessoa valer por cinco.
import { useCallback, useEffect, useState } from 'react';
import { HeartHandshake, Check, Loader2, X, Pencil } from 'lucide-react';
import { createAuthHeaders } from '../services/api';

const API = import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com';
const ROTA = `${API}/api/admin/social/nominations`;

export default function IndicarInstituicao() {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  // O que ESTA pessoa já indicou. null = ainda não indicou (ou não deu pra
  // saber). Sem isto, quem já votou reabre a caixa, vê formulário vazio e
  // manda de novo achando que a primeira vez falhou.
  const [minha, setMinha] = useState(null);
  const [trocando, setTrocando] = useState(false);
  const [acabouDeEnviar, setAcabouDeEnviar] = useState(false);

  const buscarMinha = useCallback(async () => {
    try {
      const r = await fetch(`${ROTA}/minha`, { headers: createAuthHeaders() });
      if (!r.ok) return;
      const d = await r.json();
      if (d?.minha) setMinha(d.minha);
    } catch {
      // Silencioso: sem esta informação a caixa mostra o formulário normal e
      // o servidor continua garantindo o voto único.
    }
  }, []);

  useEffect(() => { buscarMinha(); }, [buscarMinha]);

  useEffect(() => {
    if (!aberto) return;
    const esc = (e) => { if (e.key === 'Escape') setAberto(false); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [aberto]);

  const enviar = async (e) => {
    e.preventDefault();
    const limpo = nome.trim();
    if (limpo.length < 3) { setErro('Escreva o nome da instituição.'); return; }
    setEnviando(true); setErro('');
    try {
      const r = await fetch(`${ROTA}/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...createAuthHeaders() },
        body: JSON.stringify({ nome: limpo, motivo: motivo.trim() || null }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || d.erro || 'Não consegui registrar agora.');
      setMinha({ nome: limpo, motivo: motivo.trim() || null, votos: d.votos || 1 });
      setAcabouDeEnviar(true);
      setTrocando(false);
      setNome(''); setMotivo('');
    } catch (e2) {
      setErro(e2.message || 'Não consegui registrar agora.');
    } finally {
      setEnviando(false);
    }
  };

  const abrirTroca = () => {
    setNome(minha?.nome || '');
    setMotivo(minha?.motivo || '');
    setTrocando(true);
    setAcabouDeEnviar(false);
    setErro('');
  };

  const fechar = () => {
    setAberto(false);
    setTimeout(() => { setTrocando(false); setAcabouDeEnviar(false); setErro(''); }, 250);
  };

  const mostrarFormulario = !minha || trocando;

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="mt-2 inline-flex min-h-[36px] max-w-full items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/30"
      >
        <HeartHandshake className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">
          {minha ? `Você indicou ${minha.nome}` : 'Indique quem deve receber'}
        </span>
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          onClick={fechar}
          role="dialog"
          aria-modal="true"
          aria-label="Indicar instituição para o Dia I"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold leading-tight text-gray-900">
                  {mostrarFormulario ? 'Quem deveria receber?' : 'Sua indicação'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  No Dia I, todo o lucro da Inksa vai para uma causa da cidade.
                  {mostrarFormulario ? ' Diz qual você indica.' : ''}
                </p>
              </div>
              <button
                onClick={fechar}
                className="-mr-1 -mt-1 shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!mostrarFormulario ? (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="flex items-center gap-2 font-bold text-green-800">
                  <Check className="h-5 w-5 shrink-0" />
                  {acabouDeEnviar ? 'Indicação anotada.' : 'Você já indicou.'}
                </p>
                <p className="mt-1 text-base font-extrabold text-green-900">{minha.nome}</p>
                {minha.motivo && (
                  <p className="mt-1 text-sm italic text-green-700">“{minha.motivo}”</p>
                )}
                <p className="mt-2 text-sm text-green-700">
                  {minha.votos > 1
                    // Número do banco, não enfeite: mostra que a indicação tem
                    // companhia e que a escolha é da cidade.
                    ? `Você e mais ${minha.votos - 1} ${minha.votos - 1 === 1 ? 'pessoa indicaram' : 'pessoas indicaram'} essa.`
                    : 'Você foi a primeira pessoa a indicar essa.'}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    onClick={abrirTroca}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-800 underline underline-offset-2"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Trocar minha indicação
                  </button>
                  <button onClick={fechar} className="text-sm text-green-700">Fechar</button>
                </div>
                <p className="mt-3 text-xs text-green-700/70">
                  Cada pessoa tem uma indicação. Trocar substitui a sua — não
                  cria outra.
                </p>
              </div>
            ) : (
              <form onSubmit={enviar}>
                {trocando && (
                  <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Isto vai <strong>substituir</strong> a sua indicação atual
                    {minha?.nome ? ` (${minha.nome})` : ''}.
                  </p>
                )}

                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Instituição
                </label>
                <input
                  value={nome}
                  onChange={(e) => { setNome(e.target.value); if (erro) setErro(''); }}
                  placeholder="Ex.: Lar de Idosos São Vicente"
                  maxLength={140}
                  autoFocus
                  className="mt-1 min-h-[44px] w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-800 outline-none focus:border-orange-500"
                />

                <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Por que essa? <span className="normal-case text-gray-400">(opcional)</span>
                </label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={3}
                  maxLength={400}
                  placeholder="Conta em uma linha o que eles fazem."
                  className="mt-1 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-orange-500"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Esse texto ajuda mais que o voto na hora de escolher.
                </p>

                {erro && <p className="mt-3 text-sm font-semibold text-red-600">{erro}</p>}

                <button
                  type="submit"
                  disabled={enviando}
                  className="mt-4 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-orange-600 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60"
                >
                  {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {enviando ? 'Enviando' : trocando ? 'Substituir indicação' : 'Enviar indicação'}
                </button>

                {trocando && (
                  <button
                    type="button"
                    onClick={() => setTrocando(false)}
                    className="mt-2 w-full text-center text-sm text-gray-500"
                  >
                    Cancelar
                  </button>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
