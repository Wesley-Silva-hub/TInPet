import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const rootEnv = fileURLToPath(new URL('../../.env', import.meta.url))
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv)

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? 'postgresql://tinpet:tinpet@localhost:5432/tinpet_test'
// Exportada para o global-setup, que roda fora dos workers
process.env.TEST_DATABASE_URL = testDatabaseUrl

export default defineConfig({
  test: {
    globalSetup: ['./src/test/global-setup.ts'],
    // Os testes de integração compartilham o mesmo banco
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl,
      DIRECT_URL: testDatabaseUrl,
      JWT_SECRET: 'segredo-de-teste-com-pelo-menos-32-caracteres',
      STORAGE_DRIVER: 'local',
      CORS_ORIGINS: '',
    },
  },
})
