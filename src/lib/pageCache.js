// Cache simples em memória (sobrevive só durante a sessão do app, some ao
// recarregar a página). Cada rota vira um novo componente ao navegar no
// React Router — sem isso, toda página busca dados do zero e mostra tela
// cheia de carregamento de novo, mesmo já tendo visitado antes na mesma
// sessão. Com o cache, a página mostra os últimos dados vistos na hora e
// atualiza por baixo, sem bloquear a tela.
const cache = new Map();

export function getPageCache(key) {
  return cache.has(key) ? cache.get(key) : undefined;
}

export function setPageCache(key, data) {
  cache.set(key, data);
}
