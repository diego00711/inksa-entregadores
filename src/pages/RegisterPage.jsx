// Ficheiro: src/pages/RegisterPage.jsx (VERSÃO FINAL E CORRETA)

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DeliveryService from '../services/deliveryService';

// Importações de UI
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';

// ✅✅✅ CORREÇÃO APLICADA AQUI ✅✅✅
// Adicionada a palavra-chave 'default' para padronizar a exportação.
export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    setErrorMessage('');

    try {
      await DeliveryService.register(formData.name, formData.email, formData.password, formData.phone);
      // Após o registro bem-sucedido, redireciona para a página de login
      navigate('/login');
    } catch (err) {
      console.error("Erro no registro:", err);
      setErrorMessage(err.message || 'Não foi possível criar a conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl rounded-lg border-none">
        <CardHeader className="text-center space-y-2 pt-6 pb-2">
          <div className="flex justify-center mb-2">
            <img src="/inka-logo.png" alt="Inksa Logo" className="w-24 h-24 object-contain" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-800">Crie sua Conta</CardTitle>
            <CardDescription className="text-gray-600">Junte-se à nossa equipe de entregadores.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pb-6 px-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input id="name" type="text" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" type="tel" value={formData.phone} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={formData.password} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input id="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} required />
            </div>

            {errorMessage && (
              <div className="text-red-600 text-sm text-center p-2 bg-red-50 rounded-md">
                {errorMessage}
              </div>
            )}

            <Button type="submit" className="w-full h-9 text-base font-semibold bg-orange-500 hover:bg-orange-600 text-white" disabled={loading}>
              {loading ? 'A Criar...' : 'Criar Conta'}
            </Button>
          </form>

          <div className="text-center mt-4">
            <span className="text-sm text-gray-600">Já tem uma conta? </span>
            <Link to="/login" className="p-0 h-auto text-base text-orange-500 hover:text-orange-600 font-semibold inline-block">
              Faça Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
