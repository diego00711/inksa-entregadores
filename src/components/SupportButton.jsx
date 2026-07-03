import { useState, useEffect } from 'react';
import { X, MessageCircle, Mail, Phone, Clock, Loader2 } from 'lucide-react';
import { DELIVERY_API_URL } from '../services/api';

const FALLBACK = {
  email: "suporte@inksadelivery.com.br",
  whatsapp: "5549999679697",
  phone: "(49) 99967-9697",
  hours: "Seg a Sex, 8h às 18h",
};

const CACHE_KEY = 'inksa.support_info';
const CACHE_TTL_MS = 60 * 60 * 1000;

function loadCached() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return data;
  } catch { return null; }
}

function saveCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

export default function SupportButton() {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState(() => loadCached() || FALLBACK);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    const fetchInfo = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${DELIVERY_API_URL}/api/public/support-info`);
        if (!res.ok) return;
        const data = await res.json();
        if (alive && data && (data.email || data.whatsapp)) {
          setInfo(data);
          saveCache(data);
        }
      } catch {}
      finally { if (alive) setLoading(false); }
    };
    fetchInfo();
    return () => { alive = false; };
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed right-6 z-50 w-14 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 bottom-[calc(56px+env(safe-area-inset-bottom)+1rem)] lg:bottom-6"
        title="Suporte / SAC"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-gray-900 mb-1">Central de Suporte</h2>
            <p className="text-sm text-gray-500 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {info.hours || FALLBACK.hours}
            </p>
            {loading && (
              <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Atualizando…
              </p>
            )}

            <div className="space-y-3 mt-4">
              <a href={`mailto:${info.email || FALLBACK.email}`} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-orange-50 hover:border-orange-300 transition-colors group">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-orange-700">E-mail</p>
                  <p className="text-xs text-gray-500 truncate">{info.email || FALLBACK.email}</p>
                </div>
              </a>

              <a href={`https://wa.me/${(info.whatsapp || FALLBACK.whatsapp).replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-green-50 hover:border-green-300 transition-colors group">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-green-700">WhatsApp</p>
                  <p className="text-xs text-gray-500">{info.phone || FALLBACK.phone}</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
