// src/components/Header.jsx — cabeçalho da página (saudação + avatar real)

import React from 'react';
import { Bell } from 'lucide-react';
import { useProfile } from '../context/DeliveryProfileContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

function UserAvatar({ profile }) {
  const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();
  const initials = fullName
    ? fullName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'EN';

  if (profile?.avatar_url) {
    return (
      <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-orange-400 bg-gray-200">
        <img
          src={profile.avatar_url}
          alt="Avatar"
          className="w-full h-full object-cover"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center ring-2 ring-orange-300">
      <span className="font-bold text-white text-sm">{initials}</span>
    </div>
  );
}

export function Header() {
  const { profile, loading: profileLoading } = useProfile();
  const addToast = useToast();

  const hour = new Date().getHours();
  const greeting = hour >= 5 && hour < 12 ? 'Bom dia' : hour >= 12 && hour < 18 ? 'Boa tarde' : 'Boa noite';

  const firstName =
    profile?.first_name || (profile?.name ? profile.name.split(' ')[0] : 'Entregador');

  return (
    <header className="flex items-center justify-between p-4 sm:p-6 border-b border-border/60 bg-background">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
          {greeting}, {profileLoading ? '...' : firstName}!
        </h1>
        <p className="text-muted-foreground text-sm">
          Confira as entregas disponíveis.
        </p>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <button
          onClick={() => addToast('Notificações em breve!', 'info')}
          className="p-2 rounded-full hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Notificações"
        >
          <Bell className="w-5 h-5" />
        </button>
        <UserAvatar profile={profile} />
      </div>
    </header>
  );
}
