// sw.js - Service Worker para PWA Inksa Entregadores
const CACHE_NAME = 'inksa-entregadores-v1.0.0';
const CACHE_URLS = [
  '/',
  '/delivery/dashboard',
  '/delivery/entregas', 
  '/delivery/ganhos',
  '/delivery/avaliacoes',
  '/delivery/gamificacao',
  '/delivery/meu-perfil',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Estratégia de cache
const CACHE_STRATEGIES = {
  // Arquivos essenciais - Cache First
  CACHE_FIRST: [
    '/icons/',
    '/static/',
    '.css',
    '.js',
    '.png',
    '.jpg',
    '.jpeg',
    '.svg',
    '.woff',
    '.woff2'
  ],
  // API calls - Network First
  NETWORK_FIRST: [
    '/api/',
    'api
