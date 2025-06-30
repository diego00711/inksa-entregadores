import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'; // Se você usar aliases, caso contrário, pode remover

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Lembre-se, use '/'
  resolve: { // Se você usa aliases, caso contrário, pode remover
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});