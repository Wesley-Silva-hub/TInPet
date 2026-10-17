import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// As variáveis ficam no .env da raiz do monorepo
const envDir = '../..'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, '')
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:3333'
  return {
    envDir,
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      // Mesma origem em dev: o navegador chama /api e o Vite encaminha para a API (inclui WebSocket)
      proxy: { '/api': { target: apiTarget, ws: true } },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test-setup.ts'],
    },
  }
})
