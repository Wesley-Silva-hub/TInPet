import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'prisma/config'

// Em desenvolvimento as variáveis ficam no .env da raiz do monorepo.
const rootEnv = fileURLToPath(new URL('../../.env', import.meta.url))
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv)

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx --env-file-if-exists=../../.env prisma/seed.ts',
  },
  datasource: {
    // Migrations usam a conexão direta (no Supabase o pooler em modo transação não serve para DDL).
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || '',
  },
})
