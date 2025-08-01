// Ficheiro: src/pages/DeliveryDashboard.jsx (VERSÃO FINAL E CORRETA)

import React, { useState, useEffect } from 'react';
import DeliveryService from '../services/deliveryService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Truck, Star } from 'lucide-react';

// ✅✅✅ CORREÇÃO PRINCIPAL: Adicionada a palavra-chave 'default' ✅✅✅
export default function DeliveryDashboard() {
  const [stats, setStats] = useState({
    todayDeliveries: 0,
    todayEarnings: 0,
    avgRating: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const statsData = await DeliveryService.getDashboardStats();
        setStats(statsData);
      } catch (err) {
        setError(err.message || 'Não foi possível carregar as estatísticas.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div className="page-container text-center">A carregar dashboard...</div>;
  }

  if (error) {
    return <div className="page-container text-center text-red-500">Erro: {error}</div>;
  }

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-500">Resumo das suas atividades de hoje.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganhos de Hoje</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {stats.todayEarnings.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregas de Hoje</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.todayDeliveries}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sua Avaliação</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgRating.toFixed(1)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Você pode adicionar mais seções aqui, como um gráfico de ganhos ou uma lista de entregas recentes */}
    </div>
  );
}
