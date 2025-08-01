// Ficheiro: src/components/Sidebar.jsx (VERSÃO FINAL)

import React from 'react';
import { NavLink } from 'react-router-dom';
import { useProfile } from '../context/DeliveryProfileContext.jsx';
import { LayoutDashboard, List, BarChart2, User, LogOut } from 'lucide-react';

export function Sidebar() {
  const { profile, logout } = useProfile();

  // Caminhos corretos que correspondem ao App.jsx
  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/delivery/dashboard' },
    { name: 'Entregas', icon: List, path: '/delivery/entregas' },
    { name: 'Ganhos', icon: BarChart2, path: '/delivery/ganhos' },
    { name: 'Meu Perfil', icon: User, path: '/delivery/meu-perfil' },
  ];

  return (
    <div className="sidebar">
      <div>
        <div className="sidebar-header">
          <img src="/inka-logo.png" alt="Inksa Logo" className="logo h-16 mx-auto mb-8" />
          <div className="profile-info text-center">
            <img 
              src={profile?.avatar_url || 'https://sbcf.fr/wp-content/uploads/2018/03/sbcf-default-avatar.png'} 
              alt="Avatar" 
              className="avatar w-20 h-20 rounded-full object-cover mx-auto mb-3 border-2 border-orange-400" 
            />
            <span className="profile-name font-semibold text-lg">{profile?.name || 'Entregador'}</span>
          </div>
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