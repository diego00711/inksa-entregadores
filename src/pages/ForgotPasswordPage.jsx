// Ficheiro: src/pages/ForgotPasswordPage.jsx (VERSÃO FINAL E CORRETA)

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import DeliveryService from '../services/deliveryService';

// ✅✅✅ CORREÇÃO APLICADA AQUI ✅✅✅
// Adicionada a palavra-chave 'default' para padronizar a exportação.
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await DeliveryService.forgotPassword(email);
      setMessage(response.message); // Exibe a mensagem de sucesso da API
    } catch (err) {
      // Mesmo em caso de erro, por segurança, exibimos uma mensagem genérica.
      // A mensagem de erro real pode ser vista no console do navegador.
      console.error(err);
      setMessage('Se existir uma conta com este e-mail, um link para redefinir a senha foi enviado.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-xl">
        <div className="text-center">
          {/* Supondo que o logo esteja na pasta public */}
          <img src="/inka-logo.png" alt="Inksa Logo" className="w-20 h-20 mx-auto" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Recuperar Senha</h2>
          <p className="mt-2 text-sm text-gray-600">Insira o seu email para receber o link de redefinição.</p>
        </div>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Exibe mensagem de sucesso ou erro */}
          {message && <p className="text-sm text-green-600 text-center">{message}</p>}
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={isLoading || message} // Desativa o botão se estiver a carregar ou se já enviou
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-orange-300"
            >
              {isLoading ? 'A Enviar...' : 'Enviar Link de Recuperação'}
            </button>
          </div>
        </form>

        <p className="text-sm text-center text-gray-600">
          Lembrou-se da senha?{' '}
          <Link to="/login" className="font-medium text-orange-600 hover:text-orange-500">
            Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  );
}
