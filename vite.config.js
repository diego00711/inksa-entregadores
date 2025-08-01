import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  
  // --- BLOCO ADICIONADO ---
  // Configuração do servidor de desenvolvimento
  server: {
    // Configuração do proxy
    proxy: {
      // Redireciona qualquer requisição que comece com /api...
      '/api': {
        // ...para o nosso backend Flask
        target: 'http://localhost:5000',
        // Necessário para o backend aceitar a requisição
        changeOrigin: true,
      },
    },
  },
})