// Ficheiro: src/components/StatsCards.jsx

import React from 'react';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Package, DollarSign, Star, CheckCircle } from 'lucide-react';

export function StatsCards({ stats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Card 1: Entregas Hoje */}
      <Card className="hover:shadow-lg transition-shadow rounded-xl border border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Entregas Hoje</p>
              <p className="text-3xl font-bold text-gray-900">{stats.todayDeliveries}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Ganhos Hoje */}
      <Card className="hover:shadow-lg transition-shadow rounded-xl border border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ganhos Hoje</p>
              <p className="text-3xl font-bold text-gray-900">R$ {stats.todayEarnings.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Avaliação Média */}
      <Card className="hover:shadow-lg transition-shadow rounded-xl border border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avaliação Média</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.avgRating.toFixed(1)}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Star className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Taxa de Conclusão */}
      <Card className="hover:shadow-lg transition-shadow rounded-xl border border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taxa de Conclusão</p>
              <p className="text-3xl font-bold text-green-600">{stats.completionRate}%</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}