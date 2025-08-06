// Ficheiro: src/pages/EarningsPage.jsx (VERSÃO TURBINADA)

import React, { useState, useEffect, useCallback } from 'react';
import DeliveryService from '../services/deliveryService';
import { useProfile } from '../context/DeliveryProfileContext';
import { useToast } from '../context/ToastContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'; // Componentes de gráfico
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Para os cards de sumário
import { CalendarIcon, DollarSign, Truck } from 'lucide-react'; // Ícones
import { format, subDays } from 'date-fns'; // Para formatação e manipulação de datas

// Se você usa o componente DatePicker de Shadcn/ui (ou similar)
// import { DatePicker } from '@/components/ui/date-picker'; // Ajuste o caminho se necessário
// Se não, você precisará de um input de data HTML simples ou outra biblioteca.

// Helper para formatar o endereço (reutilizado do dashboard)
const formatAddress = (street, number, neighborhood, city, state) => {
    if (street || number || neighborhood || city || state) {
        const parts = [street, number, neighborhood, city, state].filter(Boolean);
        return parts.join(', ');
    }
    return 'Endereço não informado';
};

export function EarningsPage() {
    const { profile, loading: profileLoading } = useProfile();
    const addToast = useToast();

    const [earningsData, setEarningsData] = useState({
        periodStartDate: '',
        periodEndDate: '',
        totalEarningsPeriod: 0,
        totalDeliveriesPeriod: 0,
        dailyEarnings: [], // Para o gráfico de ganhos diários
        detailedDeliveries: [] // Para a tabela detalhada
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Estado para o período de datas
    const [startDate, setStartDate] = useState(subDays(new Date(), 6)); // Padrão: 7 dias atrás
    const [endDate, setEndDate] = useState(new Date()); // Padrão: hoje

    // Função para buscar os dados de ganhos
    const fetchEarningsData = useCallback(async () => {
        if (profileLoading || !profile?.id) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError('');
        try {
            // Formata as datas para YYYY-MM-DD para a API
            const formattedStartDate = format(startDate, 'yyyy-MM-dd');
            const formattedEndDate = format(endDate, 'yyyy-MM-dd');

            const data = await DeliveryService.getEarningsHistory(formattedStartDate, formattedEndDate);
            setEarningsData(data);
        } catch (err) {
            console.error("Erro ao buscar histórico de ganhos:", err);
            setError(err.message || 'Não foi possível carregar o histórico de ganhos.');
            addToast(err.message || 'Erro ao carregar ganhos', 'error');
        } finally {
            setLoading(false);
        }
    }, [profile, profileLoading, startDate, endDate, addToast]); // Dependências: profile, datas

    useEffect(() => {
        fetchEarningsData();
    }, [fetchEarningsData]); // Dispara a busca quando fetchEarningsData muda (e, portanto, quando as datas ou profile mudam)

    // Handler para selecionar períodos pré-definidos
    const handlePeriodChange = (days) => {
        const newEndDate = new Date();
        const newStartDate = subDays(newEndDate, days - 1); // -1 para incluir o dia atual
        setStartDate(newStartDate);
        setEndDate(newEndDate);
    };

    if (profileLoading || loading) {
        return <div className="page-container text-center py-10">A carregar dados de ganhos...</div>;
    }

    if (error) {
        return <div className="page-container text-center text-red-500 py-10">Erro: {error}</div>;
    }

    return (
        <div className="earnings-container p-6 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Relatório de Ganhos</h1>
            <p className="text-gray-500 mb-6">Veja o seu desempenho e histórico de entregas.</p>

            {/* Seleção de Período */}
            <div className="mb-8 flex flex-col sm:flex-row items-center gap-4 p-4 bg-white rounded-lg shadow-md">
                <span className="font-medium text-gray-700 mr-2">Filtrar por:</span>
                <button 
                    onClick={() => handlePeriodChange(7)} 
                    className="px-4 py-2 rounded-md bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors text-sm"
                >
                    Últimos 7 dias
                </button>
                <button 
                    onClick={() => handlePeriodChange(30)} 
                    className="px-4 py-2 rounded-md bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors text-sm"
                >
                    Últimos 30 dias
                </button>
                <button 
                    onClick={() => { setStartDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); setEndDate(new Date()); }}
                    className="px-4 py-2 rounded-md bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors text-sm"
                >
                    Mês Atual
                </button>
                
                {/* Seletor de Data Customizado (com DatePicker do Shadcn/ui, se você o tiver) */}
                {/* Se não tiver, substitua por inputs type="date" */}
                <div className="flex items-center gap-2 text-sm text-gray-700 ml-auto">
                    <CalendarIcon className="h-5 w-5 text-gray-500" />
                    <input 
                        type="date" 
                        value={format(startDate, 'yyyy-MM-dd')} 
                        onChange={(e) => setStartDate(new Date(e.target.value))} 
                        className="p-2 border border-gray-300 rounded-md"
                    />
                    <span>até</span>
                    <input 
                        type="date" 
                        value={format(endDate, 'yyyy-MM-dd')} 
                        onChange={(e) => setEndDate(new Date(e.target.value))} 
                        className="p-2 border border-gray-300 rounded-md"
                    />
                </div>
            </div>

            {/* Cards de Sumário do Período */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
                <Card className="shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total de Ganhos</CardTitle>
                        <DollarSign className="h-5 w-5 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-700">R$ {earningsData.totalEarningsPeriod.toFixed(2)}</div>
                        <p className="text-xs text-gray-500">
                            Período: {format(new Date(earningsData.periodStartDate), 'dd/MM/yyyy')} - {format(new Date(earningsData.periodEndDate), 'dd/MM/yyyy')}
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total de Entregas</CardTitle>
                        <Truck className="h-5 w-5 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-700">{earningsData.totalDeliveriesPeriod}</div>
                    </CardContent>
                </Card>
                <Card className="shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Média por Entrega</CardTitle>
                        <DollarSign className="h-5 w-5 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-purple-700">
                            R$ {(earningsData.totalDeliveriesPeriod > 0 ? (earningsData.totalEarningsPeriod / earningsData.totalDeliveriesPeriod) : 0).toFixed(2)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Gráficos */}
            <h2 className="text-2xl font-bold text-gray-800 mb-5 border-b pb-2">Gráficos de Desempenho</h2>
            <div className="grid gap-6 lg:grid-cols-2 mb-8">
                <Card className="shadow-lg p-4">
                    <CardTitle className="text-lg font-semibold mb-4 text-gray-700">Ganhos Diários</CardTitle>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={earningsData.dailyEarnings}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="earning_date" tickFormatter={(tick) => format(new Date(tick), 'dd/MM')} />
                            <YAxis tickFormatter={(tick) => `R$${tick.toFixed(2)}`} />
                            <Tooltip formatter={(value) => [`R$${value.toFixed(2)}`, 'Ganhos']} />
                            <Legend />
                            <Line type="monotone" dataKey="total_earned_daily" stroke="#28a745" activeDot={{ r: 8 }} name="Ganhos" />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>
                <Card className="shadow-lg p-4">
                    <CardTitle className="text-lg font-semibold mb-4 text-gray-700">Entregas Diárias</CardTitle>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={earningsData.dailyEarnings}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="earning_date" tickFormatter={(tick) => format(new Date(tick), 'dd/MM')} />
                            <YAxis />
                            <Tooltip formatter={(value) => [value, 'Entregas']} />
                            <Legend />
                            <Bar dataKey="total_deliveries_daily" fill="#007bff" name="Entregas" />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            {/* Tabela Detalhada de Entregas */}
            <h2 className="text-2xl font-bold text-gray-800 mb-5 border-b pb-2">Histórico Detalhado de Entregas</h2>
            {earningsData.detailedDeliveries?.length > 0 ? (
                <Card className="shadow-lg p-4">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="min-w-full leading-normal">
                                <thead>
                                    <tr className="bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        <th className="px-5 py-3 border-b-2 border-gray-200">ID Pedido</th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200">Data</th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200">Restaurante</th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200">Cliente</th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200 text-right">Corrida (R$)</th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200 text-right">Total Pedido (R$)</th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {earningsData.detailedDeliveries.map(delivery => (
                                        <tr key={delivery.id} className="hover:bg-gray-50">
                                            <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                {delivery.id?.substring(0, 8)}...
                                            </td>
                                            <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                {format(new Date(delivery.created_at), 'dd/MM/yyyy HH:mm')}
                                            </td>
                                            <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                {delivery.restaurant_name}
                                            </td>
                                            <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                {delivery.client_name}
                                            </td>
                                            <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-right">
                                                {parseFloat(delivery.delivery_fee).toFixed(2)}
                                            </td>
                                            <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-right">
                                                {parseFloat(delivery.total_amount).toFixed(2)}
                                            </td>
                                            <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                <span className="relative inline-block px-3 py-1 font-semibold text-green-900 leading-tight">
                                                    <span aria-hidden="true" className="absolute inset-0 bg-green-200 opacity-50 rounded-full"></span>
                                                    <span className="relative">{delivery.status}</span>
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <p className="text-center text-gray-600 p-8 bg-white rounded-lg shadow-sm">
                    Nenhuma entrega concluída no período selecionado.
                </p>
            )}
        </div>
    );
}