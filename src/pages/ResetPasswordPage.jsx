import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DeliveryService from '../services/deliveryService';

export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Este useEffect é executado uma vez para extrair o token da URL
  useEffect(() => {
    // O token vem no formato: #access_token=SEU_TOKEN&...
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.substring(1)); // Remove o '#' inicial
    const accessToken = params.get('access_token');

    if (accessToken) {
      setToken(accessToken);
    } else {
      setError('Token de redefinição não encontrado ou inválido. Por favor, tente novamente.');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    if (password.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await DeliveryService.resetPassword(token, password);
      setMessage(response.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-xl">
        <div className="text-center">
          <img src="/inka-logo.png" alt="Inksa Logo" className="w-20 h-20 mx-auto" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Definir Nova Senha</h2>
        </div>
        
        {/* Se a redefinição foi bem-sucedida, mostra mensagem e link para login */}
        {message ? (
          <div className="text-center">
            <p className="text-green-600 mb-4">{message}</p>
            <Link to="/login">
              <button className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-500 hover:bg-orange-600">
                Ir para o Login
              </button>
            </Link>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password">Nova Senha</label>
              <input id="password" name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"/>
            </div>
            <div>
              <label htmlFor="confirmPassword">Confirmar Nova Senha</label>
              <input id="confirmPassword" name="confirmPassword" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"/>
            </div>
            
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}

            <div>
              <button type="submit" disabled={isLoading || !token} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300">
                {isLoading ? 'A Redefinir...' : 'Redefinir Senha'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}