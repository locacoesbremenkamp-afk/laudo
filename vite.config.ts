import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    // A chave do Gemini fica só no servidor (api/generate-ai.ts), nunca no navegador.
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Atualização ao vivo ligada; o AI Studio pode desligar com DISABLE_HMR=true.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
