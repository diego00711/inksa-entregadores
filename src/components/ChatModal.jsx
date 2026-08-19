// src/components/ChatModal.jsx
// Chat em tempo real entre entregador e cliente
// Props: orderId, isOpen, onClose, senderType="delivery"

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send } from 'lucide-react';
import { DELIVERY_API_URL, createAuthHeaders } from '../services/api';
import { supabase } from '../lib/supabase';

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch { /* silencioso */ }
}

// created_at vem do banco como "timestamp without time zone" em UTC, SEM 'Z'.
// new Date() interpretaria isso como hora LOCAL — e mostrava 3h a mais (o valor
// UTC como se fosse de SP). Aqui, se não houver fuso na string, assumimos UTC.
function toMs(ts) {
  if (!ts) return 0;
  let s = String(ts);
  if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) s = s.replace(' ', 'T') + 'Z';
  const t = new Date(s).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function fmtHora(ts) {
  const t = toMs(ts);
  return t ? new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
}

// Une o que já está na tela com o que veio do servidor, SEM substituir a lista.
// Antes o poll fazia setMessages(list) direto: uma resposta lenta, disparada
// ANTES da mensagem existir, chegava DEPOIS do envio e apagava a mensagem
// recém-enviada da tela (dava a impressão de "sumiu / só enviou uma").
// Mensagens locais ainda não confirmadas (_pending) ficam no fim até o servidor
// devolver a versão real.
function mergeMessages(prev, incoming) {
  const byId = new Map();
  for (const m of prev) if (!m?._pending && m?.id != null) byId.set(String(m.id), m);
  for (const m of incoming) if (m?.id != null) byId.set(String(m.id), m);

  const confirmed = [...byId.values()].sort((a, b) => toMs(a.created_at) - toMs(b.created_at));
  // Se o servidor já trouxe a mensagem equivalente, descarta a bolha pendente.
  const pending = prev.filter(m =>
    m?._pending &&
    !confirmed.some(c => c.sender_type === m.sender_type && (c.message ?? c.text) === m.message)
  );
  return [...confirmed, ...pending];
}

export function ChatModal({ orderId, isOpen, onClose, senderType = 'delivery', onUnreadChange }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const bottomRef = useRef(null);
  const lastMessageIdRef = useRef(null);
  const unreadRef = useRef(0);
  // Sequência das buscas: resposta de uma busca antiga que chega atrasada é
  // descartada (não pode sobrescrever um estado mais novo).
  const seqRef = useRef(0);

  const fetchMessages = useCallback(async () => {
    if (!orderId) return;
    const seq = ++seqRef.current;
    try {
      const res = await fetch(`${DELIVERY_API_URL}/api/chat/${orderId}/messages`, {
        headers: createAuthHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data?.messages || data?.data || []);
      if (seq !== seqRef.current) return; // chegou fora de ordem — ignora
      setMessages(prev => mergeMessages(prev, list));
      setLoadError(false);
      if (list.length > 0) {
        lastMessageIdRef.current = list[list.length - 1]?.id;
      }
    } catch {
      setLoadError(true);
    }
  }, [orderId]);

  // Start/stop Supabase realtime subscription when modal opens/closes
  // ── Realtime do Supabase REMOVIDO (auditoria de 18/08/2026) ────────────────
  //
  // Havia aqui uma inscrição em postgres_changes que NUNCA entregou um evento
  // sequer. A política de RLS resolve o dono comparando auth.uid() com colunas
  // que apontam pro PERFIL, não pro usuário do auth — medido no banco:
  // client_profiles.id = user_id em 0 de 24, delivery_profiles em 0 de 6 (só
  // restaurant_profiles casa, 17 de 17). E nenhum app chama
  // supabase.auth.setSession: todos conectam como anon puro, então auth.uid()
  // é NULL e nenhuma política casa.
  //
  // Provado com a chave anon do pacote publicado:
  //   GET /rest/v1/orders  ->  0 linhas
  //   GET /rest/v1/chat_messages  ->  0 linhas
  //   GET /rest/v1/delivery_tracking  ->  0 linhas
  // Sem leitura não há evento: o canal conectava e ficava mudo.
  //
  // Isso está CERTO em segurança (nenhum anônimo lê pedido ou conversa alheia).
  // O problema era o canal existir e PARECER que funcionava — em 18/08 essa
  // aparência me levou a afrouxar o polling de 6s pra 20s "porque o realtime
  // cobre". Não cobria.
  //
  // O que ele prometia já vem por dois caminhos que funcionam: o POLLING desta
  // mesma tela (app aberto) e o PUSH do FCM (app em segundo plano).
  //
  // PRA RESSUSCITAR seriam DUAS coisas, nesta ordem: (1) os apps abrirem sessão
  // no Supabase com setSession e (2) reescrever as políticas pra resolver o
  // perfil (client_id IN (SELECT id FROM client_profiles WHERE user_id =
  // auth.uid())). Mexer só numa das duas não liga nada.


  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !orderId) return;
    // Eco otimista: a bolha aparece NA HORA, antes de falar com o servidor. Antes
    // era POST + GET (duas idas) para só então desenhar — no 4G isso levava
    // segundos e parecia que a mensagem não tinha sido enviada.
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimistic = {
      id: tempId,
      _pending: true,
      sender_type: senderType,
      message: text,
      created_at: new Date().toISOString(),
    };
    setInputText('');
    setMessages(prev => [...prev, optimistic]);
    setSending(true);
    try {
      const res = await fetch(`${DELIVERY_API_URL}/api/chat/${orderId}/messages`, {
        method: 'POST',
        headers: { ...createAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sender_type: senderType }),
      });
      if (!res.ok) throw new Error('envio falhou');
      // O POST já devolve a mensagem criada — troca a bolha pendente pela real
      // sem precisar de um GET extra.
      let saved = null;
      try { saved = await res.json(); } catch { /* corpo vazio */ }
      setMessages(prev => {
        const semTemp = prev.filter(m => m.id !== tempId);
        return saved?.id ? mergeMessages(semTemp, [saved]) : semTemp;
      });
      if (!saved?.id) fetchMessages();
    } catch {
      // Falhou: tira a bolha pendente e devolve o texto pro input pra reenviar.
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInputText(prev => (prev ? prev : text));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[1100] backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div
          className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md flex flex-col"
          style={{ height: '70vh', maxHeight: '560px' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-orange-500 to-red-500 rounded-t-2xl sm:rounded-t-2xl">
            <div className="flex items-center gap-2">
              <span className="text-lg">💬</span>
              <h2 className="text-white font-bold text-base">Chat com Cliente</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/20 transition-colors text-white min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label="Fechar chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Message list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {loadError && (
              <p className="text-center text-xs text-gray-400 py-2">
                Não foi possível carregar mensagens.
              </p>
            )}

            {!loadError && messages.length === 0 && (
              <p className="text-center text-xs text-gray-400 py-8">
                Nenhuma mensagem ainda. Diga olá! 👋
              </p>
            )}

            {messages.map((msg, idx) => {
              const isDelivery =
                msg.sender_type === 'delivery' || msg.sender === 'delivery';
              return (
                <div
                  key={msg.id ?? idx}
                  className={`flex ${isDelivery ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm break-words transition-opacity ${
                      isDelivery
                        ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-br-sm'
                        : 'bg-white text-gray-800 rounded-bl-sm border border-gray-200'
                    } ${msg._pending ? 'opacity-60' : ''}`}
                  >
                    <p className="leading-relaxed">{msg.message || msg.text || msg.content}</p>
                    {msg.created_at && (
                      <p
                        className={`text-xs mt-1 ${
                          isDelivery ? 'text-white/70' : 'text-gray-400'
                        }`}
                      >
                        {msg._pending ? 'enviando…' : fmtHora(msg.created_at)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input area — piso de padding embaixo pra não ficar atrás da barra
              de navegação do Android (env(safe-area-inset-bottom) volta 0 na
              navegação de 3 botões, então o max() garante um mínimo). */}
          <div
            className="px-3 pt-3 border-t border-gray-200 bg-white rounded-b-2xl sm:rounded-b-2xl"
            style={{ paddingBottom: 'max(3rem, calc(0.75rem + env(safe-area-inset-bottom)))' }}
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite uma mensagem..."
                className="flex-1 border border-gray-300 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim()}
                className="p-2.5 bg-gradient-to-br from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-full transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center min-h-[40px] min-w-[40px]"
                aria-label="Enviar mensagem"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ChatModal;
