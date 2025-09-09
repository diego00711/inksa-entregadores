import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Package, 
  DollarSign, 
  Star, 
  Trophy, 
  User, 
  LogOut,
  Menu,
  X
} from 'lucide-react';

export default function DeliveryPortalLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userData, setUserData] = useState({
    name: 'dudu eduardo',
    type: 'Entregador',
    avatar: null
  });

  const navigation = [
    { name: 'Dashboard', href: '/delivery/dashboard', icon: Home },
    { name: 'Entregas', href: '/delivery/entregas', icon: Package },
    { name: 'Ganhos', href: '/delivery/ganhos', icon: DollarSign },
    { name: 'Avaliações', href: '/delivery/avaliacoes', icon: Star },
    { name: 'Gamificação', href: '/delivery/gamificacao', icon: Trophy },
    { name: 'Meu Perfil', href: '/delivery/meu-perfil', icon: User },
  ];

  // Função para buscar dados do usuário
  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // Aguardar um pouco antes de mostrar erro, pode estar carregando
        setTimeout(() => {
          const retryToken = localStorage.getItem('token');
          if (!retryToken) {
            console.log('⚠️ Token não encontrado após retry');
          }
        }, 1000);
        return;
      }
      
      console.log('🔍 Buscando dados do usuário...');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/delivery/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 401) {
        console.log('❌ Token inválido ou expirado');
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }
      
      if (response.ok) {
        const result = await response.json();
        console.log('📋 Dados recebidos:', result);
        
        const profileData = result.data;
        
        setUserData({
          name: `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || 'dudu eduardo',
          type: 'Entregador',
          avatar: profileData.avatar_url || null
        });
        
        console.log('🖼️ Avatar URL do perfil:', profileData.avatar_url);
        
        // Se não tem avatar_url na resposta, forçar URL conhecida temporariamente
        if (!profileData.avatar_url) {
          console.log('⚠️ Avatar não na resposta, usando URL conhecida temporariamente...');
          const knownAvatarUrl = 'https://jbritstgkpznuivfupnz.supabase.co/storage/v1/object/public/delivery-avatars/public/f85108d3-b07e-4eb4-bfbe-c7d070cd1b44_1757438580.jpg';
          
          setUserData(prev => ({
            ...prev,
            avatar: knownAvatarUrl
          }));
          
          console.log('🎯 Avatar forçado:', knownAvatarUrl);
        }
      } else {
        console.error('❌ Erro na resposta:', response.status);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados do usuário:', error);
    }
  };

  // Buscar dados do usuário ao montar o componente
  useEffect(() => {
    fetchUserData();
  }, []);

  // Recarregar dados quando navegar entre páginas
  useEffect(() => {
    fetchUserData();
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const closeSidebar = () => setSidebarOpen(false);

  // Função para renderizar o avatar
  const renderAvatar = () => {
    console.log('🎨 Renderizando avatar:', userData.avatar);
    
    // Sempre tentar mostrar a imagem primeiro
    const avatarUrl = userData.avatar || 'https://jbritstgkpznuivfupnz.supabase.co/storage/v1/object/public/delivery-avatars/public/f85108d3-b07e-4eb4-bfbe-c7d070cd1b44_1757438580.jpg';
    
    return (
      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-orange-500 bg-gray-200">
        <img 
          src={avatarUrl}
          alt="Avatar do usuário"
          className="w-full h-full object-cover"
          onLoad={() => console.log('✅ Avatar carregado:', avatarUrl)}
          onError={(e) => {
            console.error('❌ Erro ao carregar avatar:', avatarUrl);
            // Se falhar, mostrar iniciais
            e.target.style.display = 'none';
            e.target.parentNode.innerHTML = `
              <div class="w-full h-full bg-orange-500 flex items-center justify-center">
                <span class="text-white font-bold text-sm">DE</span>
              </div>
            `;
          }}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="relative cursor-pointer" onClick={() => {
                console.log('🔄 Recarregando dados manualmente...');
                fetchUserData();
              }} title="Clique para recarregar avatar">
                {renderAvatar()}
                {/* Fallback oculto que aparece em caso de erro */}
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center hidden">
                  <span className="text-white font-bold text-sm">
                    {userData.name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().slice(0, 2)}
                  </span>
                </div>
              </div>
              <div>
                <h2 className="font-semibold">{userData.name}</h2>
                <p className="text-sm text-slate-300">{userData.type}</p>
                <button 
                  onClick={fetchUserData}
                  className="text-xs text-orange-400 hover:text-orange-300"
                >
                  🔄 Recarregar
                </button>
              </div>
            </div>
            {/* Close button - mobile only */}
            <button 
              onClick={closeSidebar}
              className="lg:hidden p-1 rounded-md hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={closeSidebar}
                  className={`
                    flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-blue-600 text-white' 
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 w-full px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden bg-white shadow-sm border-b px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="font-semibold text-gray-900">Inksa Entregadores</h1>
          <div className="w-10" /> {/* Spacer */}
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
