import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, AlertCircle, MessageCircle, ArrowLeft, Send, CheckCircle2, Mail, Phone } from 'lucide-react';
import { DELIVERY_API_URL } from '../services/api';
import apiFetch from '../services/apiClient';
import authService from '../services/authService';

const STATUS_META = {
  aberto:    { label: 'Aberto',       cls: 'bg-slate-100 text-slate-700' },
  aguardando:{ label: 'Aguardando',   cls: 'bg-amber-100 text-amber-700' },
  andamento: { label: 'Em andamento', cls: 'bg-blue-100 text-blue-700' },
  resolvido: { label: 'Resolvido',    cls: 'bg-emerald-100 text-emerald-700' },
};

const CATEGORIES = ['Dúvida', 'Pagamento', 'Entrega', 'Pedido', 'Financeiro', 'Conta', 'Técnico', 'Outro'];
const PRIORITIES = ['Baixo', 'Médio', 'Alto'];

function headers() {
  const token = authService?.getToken?.() || localStorage.getItem('deliveryAuthToken');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

function NovoTicket({ onCreated, onCancel }) {
  const [form, setForm] = useState({ subject: '', description: '', category: 'Dúvida', priority: 'Baixo' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) { setError('Preencha assunto e descrição'); return; }
    setSaving(true); setError(null);
    try {
      const res = await apiFetch(`${DELIVERY_API_URL}/api/support/tickets`, { method: 'POST', headers: headers(), body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Erro ao abrir ticket');
      onCreated(data.data.id);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
      <h2 className="font-semibold text-gray-800">Abrir novo chamado</h2>
      <div>
        <label className="text-xs text-gray-600 font-medium">Assunto</label>
        <input value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} placeholder="Ex: Não consegui aceitar pedido" maxLength={120} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-600 font-medium">Categoria</label>
          <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-600 font-medium">Prioridade</label>
          <select value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-600 font-medium">Descrição</label>
        <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={5} placeholder="Conte o que aconteceu com detalhes" className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
      </div>
      {error && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg"><AlertCircle className="w-4 h-4" /> {error}</div>}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-bold bg-orange-500 text-white rounded-lg disabled:opacity-60 flex items-center gap-1">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Abrir chamado
        </button>
      </div>
    </form>
  );
}

function TicketDetalhe({ ticketId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiFetch(`${DELIVERY_API_URL}/api/support/tickets/${ticketId}`, { headers: headers() });
      const json = await res.json();
      if (res.ok) setData(json.data);
    } finally { setLoading(false); }
  }, [ticketId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const send = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      const res = await apiFetch(`${DELIVERY_API_URL}/api/support/tickets/${ticketId}/messages`, { method: 'POST', headers: headers(), body: JSON.stringify({ body }) });
      if (res.ok) { setBody(''); await fetchData(); }
    } finally { setSending(false); }
  };

  const closeTicket = async () => {
    if (!confirm('Marcar este chamado como resolvido?')) return;
    await apiFetch(`${DELIVERY_API_URL}/api/support/tickets/${ticketId}/status`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ status: 'resolvido' }) });
    fetchData();
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin h-8 w-8 text-orange-500" /></div>;
  if (!data) return <p className="text-sm text-gray-500">Chamado não encontrado.</p>;

  const { ticket, messages } = data;
  const status = STATUS_META[ticket.status] || STATUS_META.aberto;

  return (
    <div className="space-y-3">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"><ArrowLeft className="w-4 h-4" /> Voltar</button>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h2 className="font-semibold text-gray-900">{ticket.subject}</h2>
            <p className="text-xs text-gray-500">{ticket.category} • {ticket.priority} • Aberto {new Date(ticket.created_at).toLocaleDateString('pt-BR')}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${status.cls}`}>{status.label}</span>
        </div>
        <div className="space-y-3 mt-4">
          {messages.map((m) => {
            const isMe = m.author_role !== 'admin';
            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${isMe ? 'bg-orange-100 text-orange-900' : 'bg-gray-100 text-gray-800'}`}>
                  <p className="text-xs font-semibold mb-0.5">{isMe ? 'Você' : 'Suporte Inksa'}</p>
                  <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                  <p className="text-[10px] text-gray-500 mt-1">{new Date(m.created_at).toLocaleString('pt-BR')}</p>
                </div>
              </div>
            );
          })}
        </div>
        {ticket.status !== 'resolvido' ? (
          <>
            <form onSubmit={send} className="flex gap-2 mt-4">
              <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escreva uma resposta…" className="flex-1 border rounded-full px-4 py-2 text-sm" />
              <button type="submit" disabled={sending || !body.trim()} className="bg-orange-500 text-white rounded-full p-2 disabled:opacity-50">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
            <button onClick={closeTicket} className="mt-3 text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Marcar como resolvido</button>
          </>
        ) : (
          <div className="mt-4 p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg text-center">✅ Este chamado foi resolvido.</div>
        )}
      </div>
    </div>
  );
}

export default function SuportePage() {
  const [view, setView] = useState('list');
  const [selected, setSelected] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [supportInfo, setSupportInfo] = useState({ email: 'suporte@inksadelivery.com.br', whatsapp: '5549999679697', phone: '(49) 99967-9697' });

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${DELIVERY_API_URL}/api/support/tickets`, { headers: headers() });
      const json = await res.json();
      if (res.ok) setTickets(json.data || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchTickets();
    fetch(`${DELIVERY_API_URL}/api/public/support-info`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSupportInfo((p) => ({ ...p, ...d })))
      .catch(() => {});
  }, [fetchTickets]);

  if (view === 'detail' && selected) {
    return <div className="container mx-auto px-4 py-6 max-w-3xl"><TicketDetalhe ticketId={selected} onBack={() => { setSelected(null); setView('list'); fetchTickets(); }} /></div>;
  }
  if (view === 'new') {
    return <div className="container mx-auto px-4 py-6 max-w-3xl"><NovoTicket onCreated={(id) => { setSelected(id); setView('detail'); }} onCancel={() => setView('list')} /></div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
      <div className="flex justify-between items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Central de Suporte</h1>
        <button onClick={() => setView('new')} className="flex items-center gap-1 bg-orange-500 text-white px-3 py-2 rounded-lg text-sm font-bold">
          <Plus className="w-4 h-4" /> Novo chamado
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <a href={`mailto:${supportInfo.email}`} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 hover:border-orange-200 hover:shadow-sm transition-all">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center"><Mail className="w-5 h-5 text-orange-600" /></div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800">E-mail direto</p>
            <p className="text-xs text-gray-500 truncate">{supportInfo.email}</p>
          </div>
        </a>
        <a href={`https://wa.me/${(supportInfo.whatsapp || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 hover:border-green-200 hover:shadow-sm transition-all">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"><Phone className="w-5 h-5 text-green-600" /></div>
          <div>
            <p className="text-sm font-semibold text-gray-800">WhatsApp</p>
            <p className="text-xs text-gray-500">{supportInfo.phone}</p>
          </div>
        </a>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100"><h2 className="font-semibold text-gray-800">Meus chamados</h2></div>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin h-8 w-8 text-orange-500" /></div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-10 px-4">
            <MessageCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Você ainda não abriu nenhum chamado.</p>
            <button onClick={() => setView('new')} className="mt-3 text-sm font-medium text-orange-600 hover:underline">Abrir o primeiro</button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {tickets.map((t) => {
              const status = STATUS_META[t.status] || STATUS_META.aberto;
              return (
                <button key={t.id} onClick={() => { setSelected(t.id); setView('detail'); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.subject}</p>
                    <p className="text-xs text-gray-500">{t.category} • {new Date(t.updated_at).toLocaleDateString('pt-BR')} • {t.messages_count} {t.messages_count === 1 ? 'mensagem' : 'mensagens'}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${status.cls}`}>{status.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
