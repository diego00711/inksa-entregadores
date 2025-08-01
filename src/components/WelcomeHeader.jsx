// Ficheiro: src/components/WelcomeHeader.jsx

import React from 'react';

// Função para obter a saudação correta baseada na hora do dia
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) {
    return 'Bom dia';
  } else if (hour < 18) {
    return 'Boa tarde';
  } else {
    return 'Boa noite';
  }
}

// O componente em si
function WelcomeHeader({ profile, stats }) {
  const greeting = getGreeting();
  const firstName = profile?.first_name || 'Entregador';

  return (
    <div className="welcome-header">
      <h1 className="welcome-title">{greeting}, {firstName}!</h1>
      <p className="welcome-subtitle">
        Este é o resumo do seu dia até agora. Continue com o bom trabalho!
      </p>
      {/* Podemos adicionar aqui um resumo rápido no futuro, como os KMs percorridos */}
    </div>
  );
}

export default WelcomeHeader;