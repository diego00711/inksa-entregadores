// Rede de segurança: se QUALQUER tela do app estourar um erro de render, em vez
// de ficar com a tela branca (que obrigava fechar e reabrir o app), mostra uma
// tela de recuperação com botão de recarregar. Um app de entrega nunca pode
// travar sem saída no meio de uma entrega.
import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, msg: '', where: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, msg: (error && (error.message || String(error))) || 'Erro desconhecido' };
  }

  componentDidCatch(error, info) {
    // Loga pra aparecer no console/Sentry — assim dá pra descobrir a causa se
    // acontecer de novo, sem depender de "ficou branco".
    console.error('[ErrorBoundary] erro de render capturado:', error, info);
    // Guarda as 3 primeiras linhas do component stack pra mostrar na tela QUAL
    // componente quebrou — assim um print já revela a causa exata, sem console.
    try {
      const stack = (info && info.componentStack) ? String(info.componentStack) : '';
      const where = stack
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 3)
        .join('  ›  ');
      if (where) this.setState({ where });
    } catch { /* noop */ }
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
        {(this.state.msg || this.state.where) && (
          <code
            style={{
              display: 'block',
              maxWidth: 340,
              fontSize: '.72rem',
              color: '#b91c1c',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '.5rem',
              padding: '.6rem .75rem',
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
              textAlign: 'left',
            }}
          >
            {this.state.msg}
            {this.state.where && (
              <span style={{ display: 'block', marginTop: '.4rem', color: '#7f1d1d', opacity: 0.85 }}>
                em: {this.state.where}
              </span>
            )}
          </code>
        )}
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
