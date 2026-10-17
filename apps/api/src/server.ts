import { buildApp } from './app'
import { loadEnv } from './shared/env'
import { createPrisma } from './shared/prisma'
import { createStorage } from './shared/storage/storage'

const env = loadEnv()
const db = createPrisma(env.DATABASE_URL)
const app = await buildApp({ env, db, storage: createStorage(env) })

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'encerrando')
  await app.close()
  await db.$disconnect()
  process.exit(0)
}
process.once('SIGTERM', shutdown)
process.once('SIGINT', shutdown)

await app.listen({ port: env.PORT, host: env.HOST })
