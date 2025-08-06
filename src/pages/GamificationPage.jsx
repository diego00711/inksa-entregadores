// Ficheiro: src/pages/GamificationPage.jsx (VERSÃO FINAL COM MAIS ROBUSTEZ)

import React, { useState, useEffect, useCallback } from 'react';
import DeliveryService from '../services/deliveryService';
import { useProfile } from '../context/DeliveryProfileContext';
import { useToast } from '../context/ToastContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Award, TrendingUp, User } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function GamificationPage() {
    const { profile, loading: profileLoading } = useProfile();
    const addToast = useToast();

    const [gamificationStats, setGamificationStats] = useState(null);
    const [userBadges, setUserBadges] = useState([]);
    const [rankings, setRankings] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchGamificationData = useCallback(async () => {
        if (profileLoading || !profile?.user_id) {
            return;
        }
        setLoading(true);
        setError('');
        try {
            const [statsData, badgesData, rankingsData] = await Promise.all([
                DeliveryService.getGamificationStats(profile.user_id),
                DeliveryService.getUserBadges(profile.user_id),
                DeliveryService.getGlobalRankings('delivery')
            ]);
            
            // <<< MUDANÇA FINAL: Acessar os dados de forma mais segura >>>
            // Assumindo que o seu DeliveryService já retorna o objeto de dados da API.
            setGamificationStats(statsData || null);
            setUserBadges(badgesData?.badges || []);
            setRankings(rankingsData || []);

        } catch (err) {
            console.error("Erro ao buscar dados de gamificação:", err);
            const errorMessage = err.response?.data?.message || err.message || 'Não foi possível carregar as estatísticas de gamificação.';
            setError(errorMessage);
            addToast(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    }, [profile, profileLoading, addToast]);

    useEffect(() => {
        if (profile?.user_id) {
            fetchGamificationData();
        }
    }, [profile, fetchGamificationData]);
    
    const calculateProgress = () => {
        if (!gamificationStats || !gamificationStats.total_points || !gamificationStats.points_to_next_level || gamificationStats.points_to_next_level <= 0) {
            return 100;
        }
        const pointsInCurrentLevel = gamificationStats.total_points - (gamificationStats.next_level_points_required - gamificationStats.points_to_next_level);
        const pointsNeededForLevel = gamificationStats.next_level_points_required - (gamificationStats.next_level_points_required - gamificationStats.points_to_next_level);
        
        return (pointsInCurrentLevel / pointsNeededForLevel) * 100;
    };


    if (profileLoading || loading) {
        return <div className="p-6">A carregar gamificação...</div>;
    }

    if (error) {
        return <div className="p-6 text-red-500">Erro: {error}</div>;
    }
    
    const { total_points = 0, level_name = 'Iniciante', points_to_next_level = 0 } = gamificationStats || {};

    return (
        <div className="gamification-container p-6 min-h-screen bg-background text-foreground">
            <h1 className="text-3xl font-bold mb-2">Seu Progresso de Gamificação</h1>
            <p className="text-gray-600 mb-6">Acompanhe seus pontos, nível e conquistas!</p>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
                <Card className="shadow-lg hover:shadow-xl transition-shadow duration-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total de Pontos</CardTitle>
                        <Trophy className="h-5 w-5 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-yellow-700">{total_points}</div>
                        <p className="text-xs text-gray-500 mt-1">Pontos ganhos até agora</p>
                    </CardContent>
                </Card>

                <Card className="shadow-lg hover:shadow-xl transition-shadow duration-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Nível Atual</CardTitle>
                        <Award className="h-5 w-5 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-700">{level_name}</div>
                    </CardContent>
                </Card>

                <Card className="shadow-lg hover:shadow-xl transition-shadow duration-200 col-span-full lg:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Progresso para o Próximo Nível</CardTitle>
                        <TrendingUp className="h-5 w-5 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        {points_to_next_level > 0 ? (
                            <>
                                <Progress value={calculateProgress()} className="w-full h-2 bg-gray-200 rounded-full" />
                                <p className="text-xs text-gray-500 mt-1">
                                    Faltam {points_to_next_level} pontos para o próximo nível.
                                </p>
                            </>
                        ) : (
                            <p className="text-xs text-gray-500 mt-1">Você atingiu o nível máximo!</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <h2 className="text-2xl font-bold mb-5 border-b pb-2">Suas Conquistas (Badges)</h2>
            {userBadges.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {userBadges.map(badge => (
                        <Card key={badge.id} className="shadow-lg text-center p-4">
                            <CardContent className="flex flex-col items-center justify-center">
                                {badge.icon_url ? (
                                    <img src={badge.icon_url} alt={badge.name} className="h-16 w-16 mb-2" />
                                ) : (
                                    <Award className="h-16 w-16 mb-2 text-yellow-600" />
                                )}
                                <h3 className="font-semibold text-lg text-gray-800">{badge.name}</h3>
                                <p className="text-sm text-gray-600">{badge.description}</p>
                                <p className="text-xs text-gray-500 mt-1">Ganhado em: {new Date(badge.earned_at).toLocaleDateString()}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <p className="text-center text-gray-600 p-8 bg-white rounded-lg shadow-sm">
                    Nenhum emblema conquistado ainda. Continue ganhando pontos!
                </p>
            )}

            <h2 className="text-2xl font-bold mt-8 mb-5 border-b pb-2">Ranking de Entregadores</h2>
            {rankings.length > 0 ? (
                <Card className="shadow-lg p-4">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="min-w-full leading-normal">
                                <thead>
                                    <tr className="bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        <th className="px-5 py-3 border-b-2 border-gray-200">#</th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200">Entregador</th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200">Pontos</th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200">Nível</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rankings.map((entry, index) => (
                                        <tr key={entry.user_id} className="hover:bg-gray-50">
                                            <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                {index + 1}
                                            </td>
                                            <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 w-8 h-8 mr-3">
                                                        <User className="h-8 w-8 rounded-full text-gray-500" /> 
                                                    </div>
                                                    <div className="ml-3">
                                                        <p className="text-gray-900 whitespace-no-wrap">
                                                            {entry.profile_name}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                {entry.total_points}
                                            </td>
                                            <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                {entry.level_name || 'N/A'}
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
                    Ranking indisponível no momento ou sem dados.
                </p>
            )}
        </div>
    );
}