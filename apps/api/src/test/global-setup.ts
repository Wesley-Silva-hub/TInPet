import { execSync } from 'node:child_process'

/** Aplica as migrations no banco de teste (e só nele) antes da suíte. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL as string
  execSync('pnpm exec prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
  })
}
