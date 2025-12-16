import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Ładujemy zmienne z plików .env (jeśli istnieją lokalnie)
  const env = loadEnv(mode, '.', '');
  
  // Priorytet: 1. Zmienna systemowa (Docker/CI), 2. Plik .env
  const apiKey = process.env.API_KEY || env.API_KEY;

  return {
    plugins: [react()],
    define: {
      // Wstrzykujemy wartość klucza bezpośrednio do kodu JS podczas budowania
      'process.env.API_KEY': JSON.stringify(apiKey)
    },
    server: {
      host: true,
      port: 5173
    }
  };
});