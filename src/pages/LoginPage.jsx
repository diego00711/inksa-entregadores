// Ficheiro: src/pages/LoginPage.jsx (VERSÃO COM NAVEGAÇÃO REATIVA)

import React, { useState } from 'react';
// ✅ 1. IMPORTAÇÃO CORRIGIDA: Importamos também o <Navigate>
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useProfile } from '../context/DeliveryProfileContext.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';

export function LoginPage() { 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // ✅ 2. OBTEMOS O ESTADO DE AUTENTICAÇÃO DO CONTEXTO
  const { login, isAuthenticated } = useProfile();

  // ✅ 3. LÓGICA DE REDIRECIONAMENTO REATIVO
  // Se o utilizador já estiver autenticado (ou assim que o estado mudar para autenticado),
  // este componente irá automaticamente navegar para a página de entregas.
  if (isAuthenticated) {
    return <Navigate to="/delivery/entregas" replace />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      await login(email, password);
      // ✅ 4. NÃO PRECISAMOS MAIS DA NAVEGAÇÃO MANUAL AQUI
      // A mudança de estado 'isAuthenticated' irá tratar do redirecionamento.
    } catch (err) {
      console.error("Erro no login:", err);
      setErrorMessage(err.message || 'Credenciais inválidas. Verifique seu email e senha.');
    } finally {
      setLoading(false);
    }
  };

  // O JSX do formulário continua o mesmo.
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-xl rounded-lg border-none">
        <CardHeader className="text-center space-y-2 pt-6 pb-2">
          <div className="flex justify-center mb-2">
            <img src="/inka-logo.png" alt="Inksa Logo" className="w-24 h-24 object-contain" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-800">Acesse sua Conta</CardTitle>
            <CardDescription className="text-gray-600">Bem-vindo de volta!</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pb-6 px-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Senha</Label>
                <Link to="/forgot-password" className="p-0 h-auto text-sm text-gray-800 hover:text-orange-500 font-semibold">
                  Esqueceu a senha?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {errorMessage && (
              <div className="text-red-600 text-sm text-center p-2 bg-red-50 rounded-md">
                {errorMessage}
              </div>
            )}
            <Button
              type="submit"
              className="w-full h-9 text-base font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="text-center mt-4">
            <span className="text-sm text-gray-600">Não tem uma conta? </span>
            <Link to="/register" className="p-0 h-auto text-base text-orange-500 hover:text-orange-600 font-semibold inline-block">
              Cadastre-se
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}