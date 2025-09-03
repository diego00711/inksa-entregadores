              <AnimatedNumber value={dashboardStats.totalDeliveries} />
            </div>
            <p className="text-xs text-gray-600 mt-1">desde o início</p>
          </CardContent>
        </Card>

        {/* Card de Próximo Pagamento */}
        <Card className="bg-gradient-to-br from-orange-50 to-red-50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 xl:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Próximo Pagamento</CardTitle>
            <Calendar className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              R$ {dashboardStats.nextPayment?.amount?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-gray-600 mt-1">em {dashboardStats.nextPayment?.date || '--/--'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Grid Principal */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna da Esquerda - Gráficos e Metas */}
        <div className="space-y-6 lg:col-span-2">
          <EarningsChart data={dashboardStats.weeklyEarnings} />
          
          <div className="grid gap-4 sm:grid-cols-2">
            <DailyGoalCard 
              current={dashboardStats.todayEarnings} 
              goal={dashboardStats.dailyGoal} 
            />
            <OnlineTimeCard minutes={dashboardStats.onlineMinutes} />
            <RankingCard 
              position={dashboardStats.ranking} 
              total={dashboardStats.totalDeliverers} 
            />
            
            {/* Card de Sequência */}
            <Card className="bg-gradient-to-br from-red-50 to-pink-50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-red-800 flex items-center gap-2">
                  <Flame className="h-5 w-5 text-red-600" />
                  Sequência Ativa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-700">
                  {dashboardStats.streak} dias
                </div>
                <p className="text-xs text-gray-600 mt-1">trabalhando consecutivos</p>
              </CardContent>
            </Card>
          </div>

          {/* Seção de Conquistas */}
          <AchievementsSection achievements={achievements} />
        </div>

        {/* Coluna da Direita - Pedidos Ativos */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">Pedidos Ativos</h2>
            <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
              {dashboardStats.activeOrders?.length || 0}
            </span>
          </div>

          {dashboardStats.activeOrders && dashboardStats.activeOrders.length > 0 ? (
            dashboardStats.activeOrders.map(order => (
              <EnhancedActiveOrderCard
                key={order.id}
                order={order}
                onAcceptOrder={handleAcceptOrder}
                onCompleteOrder={handleCompleteOrder}
              />
            ))
          ) : (
            <Card className="p-6 text-center">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum pedido ativo</h3>
              <p className="text-gray-500 text-sm">
                {isAvailable 
                  ? 'Aguardando novos pedidos...' 
                  : 'Ative sua disponibilidade para receber pedidos'
                }
              </p>
            </Card>
          )}

          {/* Projeção de Ganhos */}
          <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-indigo-800 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                Projeção do Dia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-700">
                R$ {projectedEarnings.toFixed(2)}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Baseado no seu desempenho atual mantendo o mesmo ritmo
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
