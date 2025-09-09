// Ficheiro: src/pages/GamificationPage.jsx (PÁGINA EM CONSTRUÇÃO)

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Award, Star, Zap, Target, Gift, Wrench, Clock } from 'lucide-react';

export default function GamificationPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="relative">
                            <Wrench className="w-16 h-16 text-orange-500 animate-bounce" />
                            <div className="absolute -top-2 -right-2">
                                <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-bold text-yellow-800">!</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold text-gray-800 mb-2">
                        Gamificação em Construção
                    </h1>
                    <p className="text-lg text-gray-600 mb-4">
                        Estamos preparando algo incrível para você!
                    </p>
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>Em desenvolvimento</span>
                    </div>
                </div>

                {/* Preview do que está vindo */}
                <Card className="shadow-xl mb-8">
                    <CardContent className="p-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                            O que está chegando
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Sistema de Pontos */}
                            <div className="text-center p-4 bg-gradient-to-b from-yellow-100 to-yellow-200 rounded-lg">
                                <Trophy className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                                <h3 className="font-bold text-gray-800 mb-2">Sistema de Pontos</h3>
                                <p className="text-sm text-gray-600">
                                    Ganhe pontos a cada entrega realizada e suba de nível
                                </p>
                            </div>

                            {/* Badges e Conquistas */}
                            <div className="text-center p-4 bg-gradient-to-b from-blue-100 to-blue-200 rounded-lg">
                                <Award className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                                <h3 className="font-bold text-gray-800 mb-2">Badges</h3>
                                <p className="text-sm text-gray-600">
                                    Desbloqueie emblemas especiais por suas conquistas
                                </p>
                            </div>

                            {/* Ranking */}
                            <div className="text-center p-4 bg-gradient-to-b from-purple-100 to-purple-200 rounded-lg">
                                <Star className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                                <h3 className="font-bold text-gray-800 mb-2">Ranking</h3>
                                <p className="text-sm text-gray-600">
                                    Compete com outros entregadores no ranking global
                                </p>
                            </div>

                            {/* Desafios */}
                            <div className="text-center p-4 bg-gradient-to-b from-green-100 to-green-200 rounded-lg">
                                <Target className="w-12 h-12 text-green-600 mx-auto mb-3" />
                                <h3 className="font-bold text-gray-800 mb-2">Desafios</h3>
                                <p className="text-sm text-gray-600">
                                    Complete desafios diários e semanais especiais
                                </p>
                            </div>

                            {/* Recompensas */}
                            <div className="text-center p-4 bg-gradient-to-b from-red-100 to-red-200 rounded-lg">
                                <Gift className="w-12 h-12 text-red-600 mx-auto mb-3" />
                                <h3 className="font-bold text-gray-800 mb-2">Recompensas</h3>
                                <p className="text-sm text-gray-600">
                                    Troque seus pontos por prêmios e benefícios
                                </p>
                            </div>

                            {/* Bônus */}
                            <div className="text-center p-4 bg-gradient-to-b from-indigo-100 to-indigo-200 rounded-lg">
                                <Zap className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
                                <h3 className="font-bold text-gray-800 mb-2">Bônus</h3>
                                <p className="text-sm text-gray-600">
                                    Ganhe bônus por performance e pontualidade
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Progresso simulado */}
                <Card className="shadow-lg mb-8">
                    <CardContent className="p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
                            Progresso de Desenvolvimento
                        </h3>
                        
                        <div className="space-y-4">
                            {/* Backend */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-700">Backend & API</span>
                                    <span className="text-sm text-green-600">85%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                                </div>
                            </div>

                            {/* Frontend */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-700">Interface do Usuário</span>
                                    <span className="text-sm text-yellow-600">60%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                                </div>
                            </div>

                            {/* Testes */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-700">Testes & Ajustes</span>
                                    <span className="text-sm text-blue-600">30%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '30%' }}></div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Mensagem motivacional */}
                <Card className="shadow-lg bg-gradient-to-r from-orange-500 to-yellow-500 text-white">
                    <CardContent className="p-6 text-center">
                        <Trophy className="w-12 h-12 mx-auto mb-4 text-yellow-200" />
                        <h3 className="text-xl font-bold mb-2">Continue fazendo entregas!</h3>
                        <p className="text-yellow-100">
                            Enquanto preparamos a gamificação, continue acumulando experiência. 
                            Quando o sistema estiver pronto, você receberá retroativamente todos os pontos das suas entregas!
                        </p>
                    </CardContent>
                </Card>

                {/* Footer */}
                <div className="text-center mt-8 text-gray-500 text-sm">
                    <p>🚀 Em breve: Sistema completo de gamificação Inksa Delivery</p>
                </div>
            </div>
        </div>
    );
}
