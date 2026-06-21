import React, { useState } from 'react';
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
  X,
  Wifi,
  WifiOff,
  Loader2,
} from 'lucide-react';
import { useProfile } from '../../context/DeliveryProfileContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

// Navegação principal (aparece na sidebar e na barra inferior)
const NAVIGATION = [
  { name: 'Início', href: '/delivery/dashboard', icon: Home, primary: true },
  { name: 'Entregas', href: '/delivery/entregas', icon: Package, primary: true },
  { name: 'Ganhos', href: '/delivery/ganhos', icon: DollarSign, primary: true },
  { name: 'Avaliações', href: '/delivery/avaliacoes', icon: Star, primary: false },
  { name: 'Gamificação', href: '/delivery/gamificacao', icon: Trophy, primary: false },
  { name: 'Meu Perfil', href: '/delivery/meu-perfil', icon: User, primary: true },
];

// Tabs da barra inferior no mobile (somente os principais)
const BOTTOM_TABS = NAVIGATION.filter((n) => n.primary);

export default function DeliveryPortalLayout() {
  const location = useLocation();
  const addToast = useToast();
  const { profile, loading, updateProfile } = useProfile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  const fullName =
    `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Entregador';
  const avatarUrl = profile?.avatar_url || null;
  const isOnline = !!profile?.is_available;

  const closeSidebar = () => setSidebarOpen(false);

  const handleLogout = () => {
    localStorage.removeItem('deliveryAuthToken');
    localStorage.removeItem('deliveryUser');
    window.location.href = '/login';
  };

  const toggleOnline = async () => {
    if (savingStatus || loading) return;
    const next = !isOnline;
    setSavingStatus(true);
    try {
      await updateProfile({ is_available: next });
      addToast(`Você está ${next ? 'ONLINE 🟢' : 'OFFLINE 🔴'}!`, 'success');
    } catch {
      addToast('Não foi possível atualizar seu status.', 'error');
    } finally {
      setSavingStatus(false);
    }
  };

  const isActive = (href) => location.pathname.startsWith(href);

  const renderAvatar = (size = 'h-11 w-11') => {
    const initials =
      fullName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || 'EN';
    return (
      <div className="relative shrink-0">
        {avatarUrl ? (
          <div className={`${size} rounded-full overflow-hidden ring-2 ring-orange-400 bg-gray-700`}>
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        ) : (
          <div className={`${size} rounded-full ring-2 ring-orange-400 bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center`}>
            <span className="text-white font-bold text-sm">{initials}</span>
          </div>
        )}
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-gray-900 ${
            isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
          }`}
        />
      </div>
    );
  };

  // ── Toggle ONLINE/OFFLINE reaproveitado (sidebar + drawer) ──────────────────
  const OnlineToggle = () => (
    <button
      onClick={toggleOnline}
      disabled={savingStatus || loading}
      className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-300 shadow-lg disabled:opacity-70 ${
        isOnline
          ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
          : 'bg-gradient-to-r from-gray-700 to-gray-800 text-gray-200'
      }`}
    >
      <span className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full bg-white ${isOnline ? 'animate-pulse' : 'opacity-50'}`} />
        {isOnline ? 'ONLINE' : 'OFFLINE'}
      </span>
      {savingStatus ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isOnline ? (
        <Wifi className="h-4 w-4" />
      ) : (
        <WifiOff className="h-4 w-4" />
      )}
    </button>
  );

  // ── Conteúdo da sidebar (compartilhado entre desktop e drawer mobile) ───────
  const SidebarBody = () => (
    <div className="flex flex-col h-full">
      {/* Marca */}
      <div className="flex items-center justify-between px-4 pt-5 pb-4 border-b border-white/10">
        <Link to="/delivery/dashboard" onClick={closeSidebar} className="flex items-center gap-2.5 min-w-0">
          <img src="/inka-logo.png" alt="Inksa" className="h-9 w-9 rounded-xl object-cover shadow" />
          <div className="min-w-0">
            <p className="font-extrabold text-white leading-tight truncate">Inksa</p>
            <p className="text-[11px] uppercase tracking-wider text-orange-400 font-semibold leading-tight">
              Entregadores
            </p>
          </div>
        </Link>
        <button onClick={closeSidebar} className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Perfil + status */}
      <div className="px-4 py-4 border-b border-white/10 space-y-3">
        <div className="flex items-center gap-3">
          {renderAvatar()}
          <div className="min-w-0">
            <p className="font-semibold text-white truncate">{loading ? 'Carregando...' : fullName}</p>
            <p className={`text-xs font-medium ${isOnline ? 'text-green-400' : 'text-gray-400'}`}>
              {isOnline ? 'Disponível para entregas' : 'Indisponível'}
            </p>
          </div>
        </div>
        <OnlineToggle />
      </div>

      {/* Navegação */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAVIGATION.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all min-h-[44px] ${
                active
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-900/30'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sair */}
      <div className="p-3 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-gray-300 hover:bg-red-600 hover:text-white transition-colors min-h-[44px]"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={closeSidebar} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky lg:top-0 inset-y-0 left-0 z-50 w-64 min-w-[16rem] h-screen
          bg-gradient-to-b from-gray-900 to-gray-950 transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <SidebarBody />
      </aside>

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Header mobile com a marca */}
        <header className="lg:hidden sticky top-0 z-30 bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md">
          <div className="flex items-center justify-between px-3 py-2.5">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-white/15 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Abrir menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <img src="/inka-logo.png" alt="Inksa" className="h-7 w-7 rounded-lg object-cover" />
              <span className="font-bold text-sm">Inksa Entregadores</span>
            </div>
            {/* Pill de status rápido */}
            <button
              onClick={toggleOnline}
              disabled={savingStatus || loading}
              className={`flex items-center gap-1.5 px-2.5 h-9 rounded-full text-xs font-bold transition-colors disabled:opacity-70 ${
                isOnline ? 'bg-green-500/90 text-white' : 'bg-black/20 text-white'
              }`}
            >
              {savingStatus ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <span className={`w-2 h-2 rounded-full bg-white ${isOnline ? 'animate-pulse' : 'opacity-60'}`} />
              )}
              {isOnline ? 'ON' : 'OFF'}
            </button>
          </div>
        </header>

        {/* Página */}
        <main className="flex-1 overflow-x-hidden pb-20 lg:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Barra de navegação inferior (mobile) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4">
          {BOTTOM_TABS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`relative flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors ${
                  active ? 'text-orange-600' : 'text-gray-400'
                }`}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-orange-500" />
                )}
                <Icon className={`w-5 h-5 ${active ? 'scale-110' : ''} transition-transform`} />
                <span className="text-[10px] font-semibold">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
