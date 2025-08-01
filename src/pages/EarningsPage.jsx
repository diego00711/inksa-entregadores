// Ficheiro: src/pages/EarningsPage.jsx (VERSÃO REFATORADA E CORRETA)

import React, { useState, useEffect } from 'react';
// ✅ 1. Importações Corrigidas e Adicionadas
import { useProfile } from '../context/DeliveryProfileContext.jsx';
import DeliveryService from '../services/deliveryService.js';

// Importações de UI
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Importações de Gráficos
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

// O seu componente de gráficos está ótimo e não precisa de alterações.
function ChartsSection({ data }) {
    if (!data || data.length === 0) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="rounded-xl border border-gray-200 shadow-sm">
                    <CardHeader><CardTitle>Ganhos por Dia</CardTitle></CardHeader>
                    <CardContent className="flex items-center justify-center h-[300px]"><p className="text-gray-500">Não há dados históricos para exibir.</p></CardContent>
                </Card>
                <Card className="rounded-xl border border-gray-200 shadow-sm">
                    <CardHeader><CardTitle>Entregas por Dia</CardTitle></CardHeader>
                    <CardContent className="flex items-center justify-center h-[300px]"><p className="text-gray-500">Não há dados históricos para exibir.</p></CardContent>
                </Card>
            </div>
        );
    }
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-xl border border-gray-200 shadow-sm">
          <CardHeader><CardTitle>Ganhos por Dia</CardTitle><CardDescription>Últimos 7 dias</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value, name) => [name === 'ganhos' ? `R$ ${value}` : value, name === 'ganhos' ? 'Ganhos' : 'Entregas']} />
                <Bar dataKey="ganhos" fill="#f97316" radius={[10, 10, 0, 0]} /> 
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-gray-200 shadow-sm">
          <CardHeader><CardTitle>Entregas por Dia</CardTitle><CardDescription>Últimos 7 dias</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [value, 'Entregas']} />
                <Line type="monotone" dataKey="entregas" stroke="#2563eb" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
}


export function EarningsPage() {
    // ✅ 2. O hook useProfile agora só é usado se precisarmos do perfil, mas não para o loading.
    useProfile(); 
    
    // ✅ 3. ESTADO LOCAL PARA OS DADOS E LOADING
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);

    // ✅ 4. BUSCA DE DADOS NA PRÓPRIA PÁGINA
    // Este useEffect busca os dados de ganhos do serviço quando a página carrega.
    useEffect(() => {
        const fetchEarningsData = async () => {
            try {
                setLoading(true);
                // Lembre-se que tínhamos esta função no nosso deliveryService!
                const data = await DeliveryService.getEarningsHistory(); 
                // A sua API deve retornar os dados no formato que o gráfico espera.
                // Ex: [{ name: 'Seg', ganhos: 50, entregas: 5 }, ...]
                setChartData(data);
            } catch (error) {
                console.error("Erro ao carregar dados de ganhos:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchEarningsData();
    }, []);

    if (loading) {
        return <div className="p-6 text-center">A carregar dados de ganhos...</div>;
    }

    return (
        <div className="page-container p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Relatório de Ganhos</h1>
                <p className="text-gray-600">Veja o seu desempenho nos últimos dias.</p>
            </div>
            <ChartsSection data={chartData} />
        </div>
    );
}