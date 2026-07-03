// Ficheiro: src/pages/EarningsPage.jsx (VERSÃO TURBINADA)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import DeliveryService from '../services/deliveryService';
import { useProfile } from '../context/DeliveryProfileContext';
import { useToast } from '../context/ToastContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'; // Componentes de gráfico
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Para os cards de sumário
import { CalendarIcon, DollarSign, Truck } from 'lucide-react'; // Ícones
import { format, subDays } from 'date-fns'; // Para formatação e manipulação de datas
import { getPageCache, setPageCache } from '../lib/pageCache.js';

const EARNINGS_CACHE_KEY = 'delivery:ganhos';

// Se você usa o componente DatePicker de Shadcn/ui (ou similar)
// import { DatePicker } from '@/components/ui/date-picker'; // Ajuste o caminho se necessário
// Se não, você precisará de um input de data HTML simples ou outra biblioteca.

// Traduz e estiliza o status do pedido (mesmo padrão do DeliveryCard)
const STATUS_BADGE = {
    delivered: { label: 'Entregue', cls: 'bg-green-100 text-green-800' },
    delivery_failed: { label: 'Não entregue', cls: 'bg-red-100 text-red-800' },
    delivering: { label: 'Em rota', cls: 'bg-purple-100 text-purple-800' },
    accepted_by_delivery: { label: 'Aguardando retirada', cls: 'bg-pink-100 text-pink-800' },
    ready: { label: 'Pronto', cls: 'bg-green-100 text-green-800' },
    preparing: { label: 'Preparando', cls: 'bg-orange-100 text-orange-800' },
    accepted: { label: 'Aceito', cls: 'bg-blue-100 text-blue-800' },
    pending: { label: 'Pendente', cls: 'bg-yellow-100 text-yellow-800' },
    cancelled: { label: 'Cancelado', cls: 'bg-gray-100 text-gray-700' },
};

const StatusBadge = ({ status }) => {
    const info = STATUS_BADGE[status] || { label: status || '—', cls: 'bg-gray-100 text-gray-700' };
    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${info.cls}`}>
            {info.label}
        </span>
    );
};

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

    // Mostra os últimos dados vistos na hora (sem tela de carregamento) se já
    // visitou essa tela antes na mesma sessão, atualizando por baixo.
    const earningsCached = getPageCache(EARNINGS_CACHE_KEY);
    const [earningsData, setEarningsData] = useState(earningsCached ?? {
        periodStartDate: '',
        periodEndDate: '',
        totalEarningsPeriod: 0,
        totalDeliveriesPeriod: 0,
        dailyEarnings: [], // Para o gráfico de ganhos diários
        detailedDeliveries: [] // Para a tabela detalhada
    });
    const [loading, setLoading] = useState(!earningsCached);
    const [error, setError] = useState('');
    const hasLoadedOnceRef = useRef(!!earningsCached);

    // Estado para o período de datas
    const [startDate, setStartDate] = useState(subDays(new Date(), 6)); // Padrão: 7 dias atrás
    const [endDate, setEndDate] = useState(new Date()); // Padrão: hoje

    // Função para buscar os dados de ganhos
    const fetchEarningsData = useCallback(async () => {
        if (profileLoading || !profile?.id) {
            setLoading(false);
            return;
        }
        if (!hasLoadedOnceRef.current) setLoading(true);
        setError('');
        try {
            // Formata as datas para YYYY-MM-DD para a API
            const formattedStartDate = format(startDate, 'yyyy-MM-dd');
            const formattedEndDate = format(endDate, 'yyyy-MM-dd');

            const data = await DeliveryService.getEarningsHistory(formattedStartDate, formattedEndDate);
            setEarningsData(data);
            setPageCache(EARNINGS_CACHE_KEY, data);
        } catch (err) {
            console.error("Erro ao buscar histórico de ganhos:", err);
            setError(err.message || 'Não foi possível carregar o histórico de ganhos.');
            addToast(err.message || 'Erro ao carregar ganhos', 'error');
        } finally {
            setLoading(false);
            hasLoadedOnceRef.current = true;
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
        return (
            <div className="p-6 bg-gray-50 min-h-screen">
                <div className="h-8 bg-gray-200 rounded-lg w-1/3 mb-2 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-8 animate-pulse" />
                <div className="flex gap-3 mb-8">
                    {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-200 rounded-md w-28 animate-pulse" />)}
                </div>
                <div className="grid gap-4 md:grid-cols-3 mb-8">
                    {[1,2,3].map(i => <div key={i} className="h-28 bg-gray-200 rounded-lg animate-pulse" />)}
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                    {[1,2].map(i => <div key={i} className="h-80 bg-gray-200 rounded-lg animate-pulse" />)}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-gray-50 min-h-screen flex flex-col items-center justify-center gap-4">
                <div className="text-5xl">😕</div>
                <h2 className="text-xl font-bold text-gray-800">Erro ao carregar ganhos</h2>
                <p className="text-red-600 text-center max-w-sm">{error}</p>
                <button
                    onClick={fetchEarningsData}
                    className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors"
                >
                    Tentar Novamente
                </button>
            </div>
        );
    }

    return (
        <div className="earnings-container p-4 sm:p-6 bg-gray-50 min-h-screen">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Relatório de Ganhos</h1>
            <p className="text-gray-500 mb-4 sm:mb-6 text-sm sm:text-base">Veja o seu desempenho e histórico de entregas.</p>

            {/* Seleção de Período */}
            <div className="mb-6 sm:mb-8 flex flex-col gap-3 p-4 bg-white rounded-lg shadow-md">
                <span className="font-medium text-gray-700 text-sm">Filtrar por:</span>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => handlePeriodChange(7)}
                        className="min-h-[44px] px-4 py-2 rounded-md bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors text-sm"
                    >
                        Últimos 7 dias
                    </button>
                    <button
                        onClick={() => handlePeriodChange(30)}
                        className="min-h-[44px] px-4 py-2 rounded-md bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors text-sm"
                    >
                        Últimos 30 dias
                    </button>
                    <button
                        onClick={() => { setStartDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); setEndDate(new Date()); }}
                        className="min-h-[44px] px-4 py-2 rounded-md bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors text-sm"
                    >
                        Mês Atual
                    </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                    <CalendarIcon className="h-4 w-4 text-gray-500" />
                    <input
                        type="date"
                        value={format(startDate, 'yyyy-MM-dd')}
                        onChange={(e) => setStartDate(new Date(e.target.value))}
                        className="p-2 border border-gray-300 rounded-md text-base flex-1 min-w-0"
                    />
                    <span>até</span>
                    <input
                        type="date"
                        value={format(endDate, 'yyyy-MM-dd')}
                        onChange={(e) => setEndDate(new Date(e.target.value))}
                        className="p-2 border border-gray-300 rounded-md text-base flex-1 min-w-0"
                    />
                </div>
            </div>

            {/* Cards de Sumário do Período */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 sm:mb-8">
                <Card className="shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total de Ganhos</CardTitle>
                        <DollarSign className="h-5 w-5 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-700">R$ {earningsData.totalEarningsPeriod.toFixed(2)}</div>
                        <p className="text-xs text-gray-500">
                            Período: {earningsData.periodStartDate ? format(new Date(earningsData.periodStartDate), 'dd/MM/yyyy') : format(startDate, 'dd/MM/yyyy')} - {earningsData.periodEndDate ? format(new Date(earningsData.periodEndDate), 'dd/MM/yyyy') : format(endDate, 'dd/MM/yyyy')}
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
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-5 border-b pb-2">Gráficos de Desempenho</h2>
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 mb-6 sm:mb-8">
                <Card className="shadow-lg p-4">
                    <CardTitle className="text-lg font-semibold mb-4 text-gray-700">Ganhos Diários</CardTitle>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={earningsData.dailyEarnings}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="earning_date" tickFormatter={(tick) => { try { return format(new Date(tick), 'dd/MM'); } catch { return tick; } }} />
                            <YAxis tickFormatter={(tick) => `R$${Number(tick).toFixed(2)}`} />
                            <Tooltip formatter={(value) => [`R$${Number(value).toFixed(2)}`, 'Ganhos']} />
                            <Legend />
                            <Line type="monotone" dataKey="total_earned_daily" stroke="#16a34a" strokeWidth={2.5} activeDot={{ r: 8 }} name="Ganhos" />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>
                <Card className="shadow-lg p-4">
                    <CardTitle className="text-lg font-semibold mb-4 text-gray-700">Entregas Diárias</CardTitle>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={earningsData.dailyEarnings}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="earning_date" tickFormatter={(tick) => { try { return format(new Date(tick), 'dd/MM'); } catch { return tick; } }} />
                            <YAxis />
                            <Tooltip formatter={(value) => [value, 'Entregas']} />
                            <Legend />
                            <Bar dataKey="total_deliveries_daily" fill="#2563eb" radius={[4, 4, 0, 0]} name="Entregas" />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            {/* Tabela Detalhada de Entregas */}
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-5 border-b pb-2">Histórico Detalhado de Entregas</h2>
            {earningsData.detailedDeliveries?.length > 0 ? (
                <Card className="shadow-lg p-0 sm:p-4">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto w-full">
                            <table className="min-w-full leading-normal text-sm">
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
                                                {parseFloat(delivery.delivery_fee || 0).toFixed(2)}
                                            </td>
                                            <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-right">
                                                {parseFloat(delivery.total_amount || 0).toFixed(2)}
                                            </td>
                                            <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                <StatusBadge status={delivery.status} />
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