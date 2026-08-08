import { createContext, useContext, useEffect, useRef, useState } from 'react';
import DeliveryService from '../services/deliveryService';
import { DELIVERY_API_URL, createAuthHeaders } from '../services/api';
import { useToast } from '../context/ToastContext';

// Bip curto (mesmo som do aviso de mensagem da aba Entregas).
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 880; o.type = 'sine';
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    o.start(); o.stop(ctx.currentTime + 0.25);
  } catch { /* sem som se o browser bloquear */ }
}

const ONGOING = ['pending', 'accepted', 'accepted_by_delivery', 'picked_up', 'on_the_way', 'ready', 'preparing', 'delivering'];

// Aviso de mensagem do cliente GLOBAL: vive no layout (sempre montado), então
// o entregador recebe o toast + bip + badge em QUALQUER tela — antes o alerta
// só existia dentro da aba Entregas, então em Início/Ganhos/etc. o cliente
// mandava mensagem e o entregador não percebia.
//
// É a ÚNICA fonte de "não-lidas" do app: o FAB (Início/etc.) e o botão de chat
// do card da entrega ativa (aba Entregas) leem o mesmo `unread` via
// ChatAlarmContext. Como o hook vive no layout (sempre montado), o contador
// sobrevive à troca de abas — mensagem que chegou na Início continua contada ao
// ir pra Entregas.
export function useChatAlarm() {
  const addToast = useToast();
  const [orderId, setOrderId] = useState(null);
  const [unread, setUnread] = useState(0);
  const [open, setOpenState] = useState(false);
  const lastIdRef = useRef(null);
  const baselineDoneRef = useRef(false);
  const openRef = useRef(false);
  openRef.current = open;

  // 1) Descobre a entrega ativa (poll leve). Ao trocar de pedido, zera o
  //    controle de "última mensagem vista" e o badge.
  useEffect(() => {
    let alive = true;
    const find = async () => {
      try {
        const stats = await DeliveryService.getDashboardStats();
        const list = stats?.activeOrders || [];
        const ongoing = list.find((d) => ONGOING.includes(d.status));
        if (!alive) return;
        const next = ongoing?.id || null;
        setOrderId((prev) => {
          if (next !== prev) { lastIdRef.current = null; baselineDoneRef.current = false; setUnread(0); setOpenState(false); }
          return next;
        });
      } catch { /* silencioso */ }
    };
    find();
    const id = setInterval(() => { if (document.visibilityState === 'visible') find(); }, 20000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // 2) Poll do chat da entrega ativa. Dispara toast/bip quando a mensagem nova é
  //    do CLIENTE e o chat não está aberto; e sempre acende o badge (unread).
  useEffect(() => {
    if (!orderId) return;
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch(`${DELIVERY_API_URL}/api/chat/${orderId}/messages`, { headers: createAuthHeaders() });
        if (!alive || !res.ok) return;
        const data = await res.json();
        const listM = Array.isArray(data) ? data : (data?.messages || data?.data || []);
        const last = listM.length ? listM[listM.length - 1] : null;
        // 1ª leitura só memoriza a linha de base — INCLUSIVE com a conversa
        // vazia. Antes saíamos antes disso quando não havia mensagem nenhuma,
        // então a PRIMEIRA mensagem do cliente virava a base e não avisava:
        // só a segunda acendia o badge.
        if (!baselineDoneRef.current) {
          baselineDoneRef.current = true;
          lastIdRef.current = last?.id ?? null;
          return;
        }
        if (!last) return;
        if (last.id !== lastIdRef.current) {
          lastIdRef.current = last.id;
          const fromClient = (last.sender_type || last.sender) === 'client';
          if (fromClient && !openRef.current) {
            addToast('💬 Nova mensagem do cliente', 'info');
            playBeep();
            setUnread((n) => n + 1);
          }
        }
      } catch { /* silencioso */ }
    };
    check();
    const id = setInterval(() => { if (document.visibilityState === 'visible') check(); }, 5000);
    return () => { alive = false; clearInterval(id); };
  }, [orderId, addToast]);

  const setOpen = (v) => { setOpenState(v); if (v) setUnread(0); };

  return { orderId, unread, open, setOpen };
}

// Context pra compartilhar o MESMO estado de chat (orderId/unread/open) entre o
// layout (FAB) e as páginas (botão de chat do card). O provider vive no layout.
export const ChatAlarmContext = createContext(null);
export function useChatAlarmCtx() {
  return useContext(ChatAlarmContext) || { orderId: null, unread: 0, open: false, setOpen: () => {} };
}

export default useChatAlarm;
