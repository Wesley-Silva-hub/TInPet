import { buildApp } from './app'
import { cleanupExpiredRefreshTokens } from './modules/auth/service'
import { loadEnv } from './shared/env'
import { createPrisma } from './shared/prisma'
import { createStorage } from './shared/storage/storage'

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000

const env = loadEnv()
const db = createPrisma(env.DATABASE_URL)
const app = await buildApp({ env, db, storage: createStorage(env) })

/** Limpeza de refresh tokens vencidos: ao subir e uma vez por dia. */
const cleanupTokens = () =>
  cleanupExpiredRefreshTokens(db)
    .then((removed) => app.log.info({ removed }, 'refresh tokens vencidos removidos'))
    .catch((error: unknown) => app.log.error({ err: error }, 'falha na limpeza de tokens'))
const cleanupTimer = setInterval(cleanupTokens, CLEANUP_INTERVAL_MS)
// Não segura o processo vivo só por causa do timer
cleanupTimer.unref()

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'encerrando')
  clearInterval(cleanupTimer)
  await app.close()
  await db.$disconnect()
  process.exit(0)
}
process.once('SIGTERM', shutdown)
process.once('SIGINT', shutdown)

await app.listen({ port: env.PORT, host: env.HOST })
void cleanupTokens()
