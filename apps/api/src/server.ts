import { buildApp } from './app'
import { cleanupExpiredRefreshTokens } from './modules/auth/service'
import { sendHealthReminders } from './modules/health/reminders'
import { cleanupExpiredStories } from './modules/stories/service'
import { loadEnv } from './shared/env'
import { createPrisma } from './shared/prisma'
import { createStorage } from './shared/storage/storage'

const HOUR_MS = 60 * 60 * 1000

const env = loadEnv()
const db = createPrisma(env.DATABASE_URL)
const app = await buildApp({ env, db, storage: createStorage(env) })

/**
 * Rotinas em segundo plano: rodam ao subir e depois no intervalo. Todas são idempotentes, então
 * não tem problema a API hibernar (plano grátis) e rodar de novo ao acordar.
 */
const routines = [
  {
    name: 'limpeza de refresh tokens',
    everyMs: 24 * HOUR_MS,
    run: () => cleanupExpiredRefreshTokens(db),
  },
  { name: 'lembretes de saúde', everyMs: HOUR_MS, run: () => sendHealthReminders(app.deps) },
  { name: 'limpeza de stories', everyMs: HOUR_MS, run: () => cleanupExpiredStories(app.deps) },
]

const timers = routines.map((routine) => {
  const execute = () =>
    routine
      .run()
      .then((count) => app.log.info({ routine: routine.name, count }, 'rotina concluída'))
      .catch((error: unknown) =>
        app.log.error({ err: error, routine: routine.name }, 'rotina falhou'),
      )
  const timer = setInterval(execute, routine.everyMs)
  // Não segura o processo vivo só por causa do timer
  timer.unref()
  return { timer, execute }
})

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'encerrando')
  for (const { timer } of timers) clearInterval(timer)
  await app.close()
  await db.$disconnect()
  process.exit(0)
}
process.once('SIGTERM', shutdown)
process.once('SIGINT', shutdown)

await app.listen({ port: env.PORT, host: env.HOST })
for (const { execute } of timers) void execute()
