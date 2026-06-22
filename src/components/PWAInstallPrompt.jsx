import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

const DISMISS_KEY = 'inksa.pwa.install.dismissed';
const COOLDOWN_DAYS = 7;

function shouldHide() {
  const ts = Number(localStorage.getItem(DISMISS_KEY) || 0);
  if (!ts) return false;
  return Date.now() - ts < COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
}

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export function PWAInstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || shouldHide()) return;
    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!visible || !deferred) return null;

  const handleInstall = async () => {
    try {
      deferred.prompt();
      await deferred.userChoice;
    } catch { /* noop */ }
    setDeferred(null);
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-3 bottom-20 lg:bottom-4 lg:right-4 lg:left-auto lg:max-w-sm z-50 animate-[slideInRight_0.4s_ease-out]">
      <div className="bg-white shadow-2xl border border-orange-200 rounded-2xl p-4 flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 text-sm">Instalar Inksa Entregador</p>
          <p className="text-xs text-gray-600 mt-0.5">
            Acesse mais rápido e receba notificações de novos pedidos.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-3 py-2 rounded-lg min-h-[36px] transition-colors"
            >
              Instalar
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg min-h-[36px]"
            >
              Agora não
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Fechar"
          className="shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded-md"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
