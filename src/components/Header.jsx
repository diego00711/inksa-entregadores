// src/components/Header.jsx (ATUALIZADO: Inclui botão para avaliações)

import React from 'react';
import { Bell, Moon, Star } from 'lucide-react'; // IMPORTADO Star
import { useProfile } from '../context/DeliveryProfileContext.jsx';
import { Link, useLocation } from 'react-router-dom';

function UserAvatar() {
  return (
    <div className="w-10 h-10 rounded-full bg-card-foreground/10 flex items-center justify-center">
      <span className="font-bold text-foreground">U</span>
    </div>
  );
}

export function Header() {
  const { profile, loading: profileLoading } = useProfile();
  const location = useLocation();

  const hour = new Date().getHours();
  let greeting;
  if (hour >= 5 && hour < 12) {
    greeting = "Bom dia";
  } else if (hour >= 12 && hour < 18) {
    greeting = "Boa tarde";
  } else {
    greeting = "Boa noite";
  }

  const firstName = profile && profile.name ? profile.name.split(' ')[0] : 'Entregador';

  return (
    <header className="flex items-center justify-between p-6 border-b border-border/60 bg-background">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {greeting}, {profileLoading ? '...' : firstName}!
        </h1>
        <p className="text-muted-foreground">
          Confira as entregas disponíveis.
        </p>
      </div>
      <div className="flex items-center gap-4">
        {/* Botão de tema agora é apenas um ícone estático, sem função */}
        <button className="p-2 rounded-full hover:bg-muted" title="Trocar tema (desativado)">
            <Moon className="w-5 h-5" />
        </button>
        <button className="p-2 rounded-full hover:bg-muted">
          <Bell className="w-5 h-5" />
        </button>
        {/* NOVO BOTÃO: Central de Avaliações */}
        <Link to="/delivery/avaliacoes" className={`p-2 rounded-full hover:bg-yellow-100 ${location.pathname === '/delivery/avaliacoes' ? 'bg-yellow-200' : ''}`} title="Minhas Avaliações">
          <Star className="w-5 h-5 text-yellow-500" />
        </Link>
        <UserAvatar />
      </div>
    </header>
  );
}
