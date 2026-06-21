// src/components/ReportIncidentModal.jsx
// Fluxo "Não consegui entregar": o entregador escolhe o motivo e, no caso de
// cliente não localizado, confirma que tentou contato antes de finalizar.

import { useState, useEffect } from 'react';
import { X, Loader2, AlertTriangle, Phone, MessageCircle, Clock, Camera, Check } from 'lucide-react';
import { uploadIncidentPhoto } from '../services/orderService';

// Tempo mínimo de espera (tentando contato) antes de finalizar "cliente não
// localizado/ausente" — padrão dos grandes deliverys. Ajustável.
const WAIT_SECONDS = 180;

const REASONS = [
  { code: 'customer_not_found', emoji: '🔴', label: 'Cliente não localizado / não atende' },
  { code: 'wrong_address',      emoji: '🏠', label: 'Endereço errado ou incompleto' },
  { code: 'customer_refused',   emoji: '🙅', label: 'Cliente recusou o pedido' },
  { code: 'customer_absent',    emoji: '⏰', label: 'Ninguém para receber' },
  { code: 'payment_issue',      emoji: '💵', label: 'Problema no pagamento (dinheiro)' },
  { code: 'courier_issue',      emoji: '🛵', label: 'Problema comigo (acidente, moto, etc.)' },
];

const OUTCOMES = [
  { code: 'return_to_restaurant', emoji: '🔁', label: 'Devolver ao restaurante', hint: 'Leve o pedido de volta ao estabelecimento' },
  { code: 'dispose',             emoji: '🗑️', label: 'Descartar o pedido',       hint: 'Perecível ou sem condições de devolver' },
];

export default function ReportIncidentModal({ isOpen, orderId, onClose, onConfirm, submitting }) {
  const [reason, setReason] = useState(null);
  const [notes, setNotes] = useState('');
  const [tried, setTried] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const [waitLeft, setWaitLeft] = useState(0);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !orderId) return;
    setUploading(true);
    try {
      const url = await uploadIncidentPhoto(orderId, file);
      setPhotoUrl(url);
    } catch (err) {
      console.error('Erro ao enviar foto:', err);
    } finally {
      setUploading(false);
    }
  };

  // Inicia o cronômetro de espera quando o motivo exige tentativa de contato
  useEffect(() => {
    const needs = reason === 'customer_not_found' || reason === 'customer_absent';
    if (!needs) { setWaitLeft(0); return; }
    setWaitLeft(WAIT_SECONDS);
    const id = setInterval(() => setWaitLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [reason]);

  if (!isOpen) return null;

  // Para "cliente não localizado/ausente" exigimos: tentar contato + aguardar o tempo
  const needsContact = reason === 'customer_not_found' || reason === 'customer_absent';
  const waitDone = waitLeft === 0;
  const canSubmit = !!reason && (!needsContact || (tried && waitDone)) && !!outcome && !submitting;
  const mmss = `${String(Math.floor(waitLeft / 60)).padStart(2, '0')}:${String(waitLeft % 60).padStart(2, '0')}`;

  const handleConfirm = () => {
    if (!canSubmit) return;
    onConfirm({
      reason,
      notes: notes.trim(),
      contactAttempts: needsContact ? { tried_contact: true, waited: true } : {},
      outcome,
      photoUrl,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" /> Não consegui entregar
          </h2>
          <button onClick={onClose} disabled={submitting} className="p-2 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-500">Qual foi o problema?</p>
          <div className="space-y-2">
            {REASONS.map((r) => (
              <button
                key={r.code}
                onClick={() => setReason(r.code)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left text-sm transition-colors
                  ${reason === r.code ? 'border-orange-500 bg-orange-50 font-semibold' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <span className="text-xl">{r.emoji}</span>
                <span className="text-gray-800">{r.label}</span>
              </button>
            ))}
          </div>

          {needsContact && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
              <p className="text-sm font-medium text-amber-800">Antes de finalizar, tente falar com o cliente:</p>
              <div className="flex gap-2 text-xs text-amber-700">
                <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> Ligar</span>
                <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" /> Mensagem no chat</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input type="checkbox" checked={tried} onChange={(e) => setTried(e.target.checked)} className="h-4 w-4 text-orange-600 rounded" />
                <span className="text-sm text-gray-700">Já tentei ligar e mandar mensagem</span>
              </label>
              {!waitDone && (
                <div className="flex items-center gap-2 bg-amber-100 rounded-lg px-3 py-2 mt-1">
                  <Clock className="w-4 h-4 text-amber-700" />
                  <span className="text-sm font-semibold text-amber-800">Aguarde {mmss}</span>
                  <span className="text-xs text-amber-700">— continue tentando contato; o cliente foi avisado.</span>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-sm text-gray-600">Observação (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ex.: toquei o interfone várias vezes, sem resposta."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
            />
          </div>

          {/* Foto-comprovante (opcional) */}
          <div>
            <label className="text-sm text-gray-600">Foto-comprovante (opcional)</label>
            <label className="mt-1 flex items-center justify-center gap-2 w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50">
              {uploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
              ) : photoUrl ? (
                <><Check className="w-4 h-4 text-green-600" /> Foto adicionada — tocar para trocar</>
              ) : (
                <><Camera className="w-4 h-4" /> Tirar foto do local</>
              )}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} disabled={uploading} />
            </label>
            {photoUrl && <img src={photoUrl} alt="comprovante" className="mt-2 w-full max-h-40 object-cover rounded-lg border" />}
          </div>

          {/* O que fazer com o pedido (padrão iFood) */}
          {reason && (
            <div className="pt-1">
              <p className="text-sm font-medium text-gray-700 mb-2">O que fazer com o pedido?</p>
              <div className="space-y-2">
                {OUTCOMES.map((o) => (
                  <button
                    key={o.code}
                    onClick={() => setOutcome(o.code)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors
                      ${outcome === o.code ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <span className="text-xl">{o.emoji}</span>
                    <span>
                      <span className="block text-sm font-semibold text-gray-800">{o.label}</span>
                      <span className="block text-xs text-gray-500">{o.hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={!canSubmit}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <AlertTriangle className="w-5 h-5" />}
            Registrar ocorrência
          </button>
          <p className="text-[11px] text-gray-400 text-center">
            Nossa equipe vai analisar e tratar o caso. O cliente será avisado.
          </p>
        </div>
      </div>
    </div>
  );
}
