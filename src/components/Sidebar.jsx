// Ficheiro: src/components/Sidebar.jsx (VERSÃO FINAL E CORRIGIDA COM LINK DE GAMIFICAÇÃO)

import React from 'react';
import { NavLink } from 'react-router-dom';
import { useProfile } from '../context/DeliveryProfileContext.jsx';
import { LayoutDashboard, List, BarChart2, User, LogOut, Trophy } from 'lucide-react'; // <-- NOVO: Trophy icon

export function Sidebar() {
  const { profile, logout } = useProfile();

  // Caminhos corretos que correspondem ao App.jsx
  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/delivery/dashboard' },
    { name: 'Entregas', icon: List, path: '/delivery/entregas' },
    { name: 'Ganhos', icon: BarChart2, path: '/delivery/ganhos' },
    { name: 'Meu Perfil', icon: User, path: '/delivery/meu-perfil' },
    { name: 'Gamificação', icon: Trophy, path: '/delivery/gamificacao' }, // <-- NOVO ITEM DE NAVEGAÇÃO AQUI!
  ];

  return (
    <div className="sidebar">
      <div>
        <div className="profile-info">
            <img 
              src={profile?.avatar_url || 'https://sbcf.fr/wp-content/uploads/2018/03/sbcf-default-avatar.png'} 
              alt="Avatar" 
              className="avatar"
            />
            <span className="profile-name">{profile?.first_name || 'Entregador'} {profile?.last_name || ''}</span>
            <span className="profile-type">Entregador</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink 
              key={item.name}
              to={item.path} 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <item.icon size={20} />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="sidebar-footer">
        <button onClick={logout} className="nav-link logout-btn w-full">
            <LogOut size={20} />
            <span>Sair</span>
        </button>
      </div>
    </div>
  );
}