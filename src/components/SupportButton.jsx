import { useState } from 'react';
import { X, MessageCircle, Mail, Phone } from 'lucide-react';

export default function SupportButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed right-6 z-50 w-14 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
        style={{ bottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 0.5rem))' }}
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
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-gray-900 mb-1">Central de Suporte</h2>
            <p className="text-sm text-gray-500 mb-5">
              Estamos disponíveis de Seg a Sex, das 8h às 18h.
            </p>

            <div className="space-y-3">
              <a
                href="mailto:suporte@inksadelivery.com.br"
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-orange-50 hover:border-orange-300 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-orange-700">E-mail</p>
                  <p className="text-xs text-gray-500">suporte@inksadelivery.com.br</p>
                </div>
              </a>

              <a
                href="https://wa.me/5549999679697"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-green-50 hover:border-green-300 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-green-700">WhatsApp</p>
                  <p className="text-xs text-gray-500">(49) 99967-9697</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
