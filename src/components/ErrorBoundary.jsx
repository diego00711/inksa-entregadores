// Rede de segurança: se QUALQUER tela do app estourar um erro de render, em vez
// de ficar com a tela branca (que obrigava fechar e reabrir o app), mostra uma
// tela de recuperação com botão de recarregar. Um app de entrega nunca pode
// travar sem saída no meio de uma entrega.
import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Loga pra aparecer no console/Sentry — assim dá pra descobrir a causa se
    // acontecer de novo, sem depender de "ficou branco".
    console.error('[ErrorBoundary] erro de render capturado:', error, info);
    try {
      if (window.Sentry?.captureException) window.Sentry.captureException(error);
    } catch { /* noop */ }
  }

  handleReload = () => {
    // Recarrega a rota atual (mantém o login) — a entrega não se perde.
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: '1rem',
          padding: '2rem',
          paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))',
        }}
      >
        <div style={{ fontSize: '3rem' }}>😕</div>
        <h2 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1f2937' }}>
          Algo deu errado nesta tela
        </h2>
        <p style={{ color: '#6b7280', fontSize: '.9rem', maxWidth: 320 }}>
          Tivemos um erro inesperado. Toque em recarregar pra continuar — sua
          entrega não foi perdida.
        </p>
        <button
          onClick={this.handleReload}
          style={{
            background: '#ea580c',
            color: '#fff',
            padding: '.85rem 1.75rem',
            borderRadius: '.85rem',
            fontWeight: 700,
            border: 'none',
            fontSize: '1rem',
          }}
        >
          Recarregar
        </button>
      </div>
    );
  }
}
