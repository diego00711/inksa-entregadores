import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts'
import { 
  Truck, MapPin, Clock, DollarSign, TrendingUp, Star,
  CheckCircle, XCircle, AlertCircle, Navigation, Phone,
  Package, User, Settings, LogOut, Eye, Play, Pause,
  RotateCcw, Calendar, BarChart3, Award, Target,
  Zap, Timer, Route, Fuel, Shield
} from 'lucide-react'
import logoImg from './assets/logo.png'
import './App.css'

// Dados simulados para entregadores
const mockDeliveries = [
  {
    id: '#E001',
    customer: 'João Silva',
    restaurant: 'Burger King',
    address: 'Rua das Flores, 123 - Centro',
    distance: '2.5 km',
    value: 45.90,
    tip: 5.00,
    status: 'available',
    time: '14:30',
    phone: '(11) 99999-9999',
    estimatedTime: '25 min'
  },
  {
    id: '#E002',
    customer: 'Maria Santos',
    restaurant: 'Pizza Hut',
    address: 'Av. Principal, 456 - Jardins',
    distance: '1.8 km',
    value: 32.50,
    tip: 3.50,
    status: 'accepted',
    time: '14:25',
    phone: '(11) 88888-8888',
    estimatedTime: '20 min'
  },
  {
    id: '#E003',
    customer: 'Pedro Costa',
    restaurant: 'Subway',
    address: 'Rua do Comércio, 789 - Vila Nova',
    distance: '3.2 km',
    value: 28.00,
    tip: 2.00,
    status: 'picked_up',
    time: '14:20',
    phone: '(11) 77777-7777',
    estimatedTime: '30 min'
  },
  {
    id: '#E004',
    customer: 'Ana Oliveira',
    restaurant: 'McDonald\'s',
    address: 'Praça Central, 321 - Centro',
    distance: '1.2 km',
    value: 18.50,
    tip: 1.50,
    status: 'delivered',
    time: '14:15',
    phone: '(11) 66666-6666',
    estimatedTime: '15 min'
  }
]

const mockStats = {
  todayDeliveries: 12,
  todayEarnings: 285.50,
  avgRating: 4.8,
  completionRate: 98
}

const earningsData = [
  { name: 'Seg', ganhos: 180, entregas: 8 },
  { name: 'Ter', ganhos: 220, entregas: 10 },
  { name: 'Qua', ganhos: 195, entregas: 9 },
  { name: 'Qui', ganhos: 260, entregas: 12 },
  { name: 'Sex', ganhos: 310, entregas: 14 },
  { name: 'Sáb', ganhos: 380, entregas: 16 },
  { name: 'Dom', ganhos: 290, entregas: 13 }
]

// Componente de Login
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    // Simular autenticação
    setTimeout(() => {
      if (email === 'entregador@inksa.com' && password === 'ent123') {
        localStorage.setItem('deliveryLoggedIn', 'true')
        onLogin(true)
      } else {
        alert('Credenciais inválidas')
      }
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img 
              src={logoImg} 
              alt="Inksa Logo" 
              className="w-20 h-20 rounded-xl object-contain bg-white p-2"
            />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold text-gray-900">Inksa Entregadores</CardTitle>
            <CardDescription className="text-lg text-gray-600">App de Entregas</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email do Entregador</Label>
              <Input
                id="email"
                type="email"
                placeholder="entregador@inksa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
                required
              />
            </div>
            <Button type="submit" className="w-full h-11 text-base font-medium bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? 'Entrando...' : 'Acessar App'}
            </Button>
          </form>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm font-medium text-gray-700 mb-2">Credenciais de teste:</p>
            <p className="text-sm text-gray-600">Email: entregador@inksa.com</p>
            <p className="text-sm text-gray-600">Senha: ent123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Componente de Header
function Header({ deliveryName, isOnline, onToggleOnline, onLogout }) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <img 
            src={logoImg} 
            alt="Inksa Logo" 
            className="w-10 h-10 rounded-lg object-contain"
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{deliveryName}</h1>
            <p className="text-gray-600">Entregador Inksa</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant={isOnline ? "default" : "outline"} 
            size="sm"
            onClick={onToggleOnline}
            className={isOnline ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {isOnline ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
            {isOnline ? 'Online' : 'Offline'}
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Configurações
          </Button>
          <Button variant="outline" size="sm" onClick={onLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>
    </header>
  )
}

// Componente de Estatísticas
function StatsCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Entregas Hoje</p>
              <p className="text-3xl font-bold text-gray-900">{mockStats.todayDeliveries}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ganhos Hoje</p>
              <p className="text-3xl font-bold text-gray-900">R$ {mockStats.todayEarnings.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avaliação</p>
              <p className="text-3xl font-bold text-yellow-600">{mockStats.avgRating}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Star className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taxa de Conclusão</p>
              <p className="text-3xl font-bold text-green-600">{mockStats.completionRate}%</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Componente de Entrega
function DeliveryCard({ delivery, onUpdateStatus }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-blue-100 text-blue-800'
      case 'accepted': return 'bg-yellow-100 text-yellow-800'
      case 'picked_up': return 'bg-purple-100 text-purple-800'
      case 'delivered': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'available': return 'Disponível'
      case 'accepted': return 'Aceito'
      case 'picked_up': return 'Coletado'
      case 'delivered': return 'Entregue'
      default: return 'Desconhecido'
    }
  }

  const getNextStatus = (status) => {
    switch (status) {
      case 'available': return 'accepted'
      case 'accepted': return 'picked_up'
      case 'picked_up': return 'delivered'
      default: return status
    }
  }

  const getNextStatusText = (status) => {
    switch (status) {
      case 'available': return 'Aceitar Entrega'
      case 'accepted': return 'Coletar Pedido'
      case 'picked_up': return 'Finalizar Entrega'
      default: return ''
    }
  }

  const totalValue = delivery.value + delivery.tip

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{delivery.id}</h3>
            <p className="text-gray-600">{delivery.customer}</p>
            <p className="text-sm text-gray-500">{delivery.restaurant}</p>
          </div>
          <Badge className={getStatusColor(delivery.status)}>
            {getStatusText(delivery.status)}
          </Badge>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{delivery.address}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Navigation className="w-4 h-4" />
            <span>{delivery.distance}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>{delivery.estimatedTime}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Phone className="w-4 h-4" />
            <span>{delivery.phone}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-gray-900">
              R$ {totalValue.toFixed(2)}
            </span>
            {delivery.tip > 0 && (
              <p className="text-sm text-green-600">
                + R$ {delivery.tip.toFixed(2)} gorjeta
              </p>
            )}
          </div>
          {delivery.status !== 'delivered' && (
            <Button 
              size="sm" 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => onUpdateStatus(delivery.id, getNextStatus(delivery.status))}
            >
              {getNextStatusText(delivery.status)}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Componente de Gráficos
function ChartsSection() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Ganhos por Dia</CardTitle>
          <CardDescription>Últimos 7 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={earningsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value, name) => [
                name === 'ganhos' ? `R$ ${value}` : value,
                name === 'ganhos' ? 'Ganhos' : 'Entregas'
              ]} />
              <Bar dataKey="ganhos" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entregas por Dia</CardTitle>
          <CardDescription>Últimos 7 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={earningsData}>
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
  )
}

// Componente Principal
function DeliveryDashboard({ onLogout }) {
  const [deliveries, setDeliveries] = useState(mockDeliveries)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isOnline, setIsOnline] = useState(true)

  const handleUpdateDeliveryStatus = (deliveryId, newStatus) => {
    setDeliveries(deliveries.map(delivery => 
      delivery.id === deliveryId ? { ...delivery, status: newStatus } : delivery
    ))
  }

  const filterDeliveriesByStatus = (status) => {
    return deliveries.filter(delivery => delivery.status === status)
  }

  const handleToggleOnline = () => {
    setIsOnline(!isOnline)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        deliveryName="Carlos Silva" 
        isOnline={isOnline}
        onToggleOnline={handleToggleOnline}
        onLogout={onLogout} 
      />
      
      <main className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="deliveries">Entregas</TabsTrigger>
            <TabsTrigger value="earnings">Ganhos</TabsTrigger>
            <TabsTrigger value="profile">Perfil</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm font-medium text-gray-600">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
            
            <StatsCards />
            <ChartsSection />
            
            <Card>
              <CardHeader>
                <CardTitle>Entregas Disponíveis</CardTitle>
                <CardDescription>Pedidos próximos à sua localização</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filterDeliveriesByStatus('available').map(delivery => (
                    <DeliveryCard 
                      key={delivery.id} 
                      delivery={delivery} 
                      onUpdateStatus={handleUpdateDeliveryStatus}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deliveries" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Minhas Entregas</h2>
            </div>

            <Tabs defaultValue="all" className="space-y-4">
              <TabsList>
                <TabsTrigger value="all">Todas ({deliveries.length})</TabsTrigger>
                <TabsTrigger value="available">Disponíveis ({filterDeliveriesByStatus('available').length})</TabsTrigger>
                <TabsTrigger value="accepted">Aceitas ({filterDeliveriesByStatus('accepted').length})</TabsTrigger>
                <TabsTrigger value="picked_up">Coletadas ({filterDeliveriesByStatus('picked_up').length})</TabsTrigger>
                <TabsTrigger value="delivered">Entregues ({filterDeliveriesByStatus('delivered').length})</TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {deliveries.map(delivery => (
                    <DeliveryCard 
                      key={delivery.id} 
                      delivery={delivery} 
                      onUpdateStatus={handleUpdateDeliveryStatus}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="available">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filterDeliveriesByStatus('available').map(delivery => (
                    <DeliveryCard 
                      key={delivery.id} 
                      delivery={delivery} 
                      onUpdateStatus={handleUpdateDeliveryStatus}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="accepted">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filterDeliveriesByStatus('accepted').map(delivery => (
                    <DeliveryCard 
                      key={delivery.id} 
                      delivery={delivery} 
                      onUpdateStatus={handleUpdateDeliveryStatus}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="picked_up">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filterDeliveriesByStatus('picked_up').map(delivery => (
                    <DeliveryCard 
                      key={delivery.id} 
                      delivery={delivery} 
                      onUpdateStatus={handleUpdateDeliveryStatus}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="delivered">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filterDeliveriesByStatus('delivered').map(delivery => (
                    <DeliveryCard 
                      key={delivery.id} 
                      delivery={delivery} 
                      onUpdateStatus={handleUpdateDeliveryStatus}
                    />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="earnings" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Relatório de Ganhos</h2>
            </div>
            
            <StatsCards />
            <ChartsSection />
            
            <Card>
              <CardHeader>
                <CardTitle>Resumo Semanal</CardTitle>
                <CardDescription>Últimos 7 dias</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900">82</p>
                    <p className="text-gray-600">Total de Entregas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">R$ 1.845,00</p>
                    <p className="text-gray-600">Total de Ganhos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-600">R$ 22,50</p>
                    <p className="text-gray-600">Ganho Médio por Entrega</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Meu Perfil</h2>
            </div>
            
            <Card>
              <CardContent className="p-12">
                <div className="text-center text-gray-500">
                  <User className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">Perfil do Entregador</h3>
                  <p>Esta funcionalidade será implementada em breve.</p>
                  <p className="text-sm mt-2">Aqui você poderá editar suas informações pessoais, veículo e documentos.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

// Componente Principal da Aplicação
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    // Verificar se o entregador está logado
    const loggedIn = localStorage.getItem('deliveryLoggedIn') === 'true'
    setIsLoggedIn(loggedIn)
  }, [])

  const handleLogin = (status) => {
    setIsLoggedIn(status)
  }

  const handleLogout = () => {
    localStorage.removeItem('deliveryLoggedIn')
    setIsLoggedIn(false)
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />
  }

  return <DeliveryDashboard onLogout={handleLogout} />
}

export default App

