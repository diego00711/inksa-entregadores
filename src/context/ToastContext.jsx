// Ficheiro: src/context/ToastContext.jsx (REVISADO COM DOCUMENTAÇÃO)

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

const ToastContext = createContext(null);

/**
 * Hook personalizado que permite aos componentes filhos disparar toasts.
 * @returns {function} A função addToast.
 */
export function useToast() {
  return useContext(ToastContext);
}

/**
 * Provider que gere o estado e a renderização dos toasts na aplicação.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const icons = {
    success: <CheckCircle className="h-6 w-6 text-green-500" />,
    error: <XCircle className="h-6 w-6 text-red-500" />,
    warning: <AlertTriangle className="h-6 w-6 text-yellow-500" />,
    info: <Info className="h-6 w-6 text-blue-500" />,
  };

  /**
   * Adiciona um novo toast à lista para ser exibido.
   * O toast é removido automaticamente após 5 segundos.
   * @param {string} message - A mensagem a ser exibida no toast.
   * @param {'info' | 'success' | 'warning' | 'error'} type - O tipo do toast, que define o ícone e a cor.
   */
  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);
    
    setTimeout(() => {
      removeToast(id);
    }, 5000); // Duração do toast: 5 segundos
  }, []);

  /**
   * Remove um toast da lista, fazendo-o desaparecer da tela.
   * @param {number} id - O ID do toast a ser removido.
   */
  const removeToast = (id) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  };

  return (
    // O Provider disponibiliza a função addToast para toda a aplicação.
    <ToastContext.Provider value={addToast}>
      {children}
      
      {/* O próprio Provider é responsável por renderizar o container de toasts. */}
      <div className="fixed top-5 right-5 z-50 space-y-3">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="w-full max-w-sm p-4 bg-white rounded-lg shadow-lg flex items-start gap-4 animate-fade-in-right"
          >
            <div className="flex-shrink-0">{icons[toast.type]}</div>
            <div className="flex-grow">
              <p className="font-semibold text-gray-800">{toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}</p>
              <p className="text-sm text-gray-600">{toast.message}</p>
            </div>
            <button onClick={() => removeToast(toast.id)} className="text-gray-400 hover:text-gray-600">
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}