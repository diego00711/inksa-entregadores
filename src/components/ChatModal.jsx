// src/components/ChatModal.jsx
// Chat em tempo real entre entregador e cliente
// Props: orderId, isOpen, onClose, senderType="delivery"

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send } from 'lucide-react';
import { DELIVERY_API_URL, createAuthHeaders } from '../services/api';

export function ChatModal({ orderId, isOpen, onClose, senderType = 'delivery' }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const bottomRef = useRef(null);
  const pollingRef = useRef(null);
  const lastMessageIdRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await fetch(`${DELIVERY_API_URL}/api/chat/${orderId}/messages`, {
        headers: createAuthHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data?.messages || data?.data || []);
      setMessages(list);
      setLoadError(false);
      if (list.length > 0) {
        lastMessageIdRef.current = list[list.length - 1]?.id;
      }
    } catch {
      setLoadError(true);
    }
  }, [orderId]);

  // Start/stop polling when modal opens/closes
  useEffect(() => {
    if (!isOpen || !orderId) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      setMessages([]);
      setInputText('');
      setLoadError(false);
      return;
    }

    fetchMessages();
    pollingRef.current = setInterval(fetchMessages, 5000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isOpen, orderId, fetchMessages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending || !orderId) return;
    setSending(true);
    try {
      const res = await fetch(`${DELIVERY_API_URL}/api/chat/${orderId}/messages`, {
        method: 'POST',
        headers: { ...createAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sender_type: senderType }),
      });
      if (res.ok) {
        setInputText('');
        await fetchMessages();
      }
    } catch {
      // falha silenciosa — mensagem permanece no input para reenvio
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
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
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
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm break-words ${
                      isDelivery
                        ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-br-sm'
                        : 'bg-white text-gray-800 rounded-bl-sm border border-gray-200'
                    }`}
                  >
                    <p className="leading-relaxed">{msg.message || msg.text || msg.content}</p>
                    {msg.created_at && (
                      <p
                        className={`text-xs mt-1 ${
                          isDelivery ? 'text-white/70' : 'text-gray-400'
                        }`}
                      >
                        {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="px-3 py-3 border-t border-gray-200 bg-white rounded-b-2xl sm:rounded-b-2xl">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite uma mensagem..."
                disabled={sending}
                className="flex-1 border border-gray-300 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || sending}
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
