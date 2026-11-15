// Publica o TinPet em produção: API no Render e site no Netlify.
// Uso (na raiz do repositório): node scripts/publicar.mjs [api] [site]   (sem argumentos = os dois)
// Lê RENDER_API_KEY e NETLIFY_TOKEN do .env.deploy (fora do git) e nunca imprime os tokens.
import { spawnSync } from 'node:child_process'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const SERVICE = 'srv-db9mlm3ncjis739tgd1g'
const API_URL = 'https://tinpet-api.onrender.com'
const SITE_NAME = 'tinpetv1'
const targets = process.argv.slice(2)
const wants = (name) => targets.length === 0 || targets.includes(name)
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const log = (area, message) => process.stdout.write(`[${area}] ${message}\n`)

const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.deploy'), 'utf8')
    .split(/\r?\n/)
    .filter((line) => /^[A-Z0-9_]+=/.test(line))
    .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1).trim()]),
)

async function publishApi() {
  if (!env.RENDER_API_KEY) return log('API', 'RENDER_API_KEY vazio no .env.deploy')
  const render = async (method, path, body) =>
    (
      await fetch(`https://api.render.com/v1${path}`, {
        method,
        headers: {
          authorization: `Bearer ${env.RENDER_API_KEY}`,
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      })
    ).json()
  const deploy = await render('POST', `/services/${SERVICE}/deploys`, {
    clearCache: 'do_not_clear',
  })
  log('API', `deploy do commit ${deploy.commit?.id?.slice(0, 7)} iniciado`)
  let status = ''
  while (!['live', 'build_failed', 'update_failed', 'canceled', 'deactivated'].includes(status)) {
    await wait(15_000)
    const current = await render('GET', `/services/${SERVICE}/deploys/${deploy.id}`)
    if (current.status !== status) log('API', current.status)
    status = current.status
  }
  const health = await fetch(`${API_URL}/api/v1/health`, { signal: AbortSignal.timeout(90_000) })
    .then((response) => response.status)
    .catch(() => 0)
  log('API', `health: ${health}`)
}

async function publishSite() {
  if (!env.NETLIFY_TOKEN) return log('SITE', 'NETLIFY_TOKEN vazio no .env.deploy')
  const netlify = async (path, init = {}) =>
    (
      await fetch(`https://api.netlify.com/api/v1${path}`, {
        ...init,
        headers: { authorization: `Bearer ${env.NETLIFY_TOKEN}`, ...init.headers },
      })
    ).json()
  log('SITE', 'gerando o build...')
  const build = spawnSync('pnpm', ['--filter', '@tinpet/web', 'build'], {
    cwd: ROOT,
    shell: true,
    // O Socket.IO não passa pelo proxy do Netlify: o front fala direto com a API
    env: { ...process.env, VITE_SOCKET_URL: API_URL },
    encoding: 'utf8',
  })
  if (build.status !== 0) return log('SITE', `build falhou:\n${build.stderr.slice(-500)}`)
  const dist = join(ROOT, 'apps/web/dist')
  // As regras do netlify.toml no formato que o deploy por arquivo entende
  writeFileSync(
    join(dist, '_redirects'),
    `/api/*  ${API_URL}/api/:splat  200!\n/assets/*  /404.html  404\n/*  /index.html  200\n`,
  )
  writeFileSync(
    join(dist, '_headers'),
    // Sem cache longo em /assets: um cache "imutável" guardaria também um 404
    '/sw.js\n  Cache-Control: no-cache\n',
  )
  // tar do Windows grava caminhos com "/" (o Compress-Archive grava "\" e o site quebra)
  const zip = join(ROOT, 'apps/web/site.zip')
  const tar = process.platform === 'win32' ? 'C:/Windows/System32/tar.exe' : 'zip'
  const args =
    process.platform === 'win32' ? ['-a', '-c', '-f', zip, '-C', dist, '*'] : ['-r', zip, '.']
  const pack = spawnSync(tar, args, { cwd: dist, encoding: 'utf8' })
  if (pack.status !== 0) return log('SITE', `não consegui compactar: ${pack.stderr}`)
  const sites = await netlify('/sites?filter=all')
  const site = sites.find((item) => item.name === SITE_NAME)
  const deploy = await netlify(`/sites/${site.id}/deploys`, {
    method: 'POST',
    headers: { 'content-type': 'application/zip' },
    body: readFileSync(zip),
  })
  rmSync(zip, { force: true })
  let state = ''
  while (state !== 'ready' && state !== 'error') {
    await wait(4_000)
    state = (await netlify(`/deploys/${deploy.id}`)).state
  }
  const page = await fetch(`https://${SITE_NAME}.netlify.app/`).then((response) => response.text())
  const script = page.match(/\/assets\/index[.-][\w-]+\.js/)?.[0]
  const ok = script
    ? (await fetch(`https://${SITE_NAME}.netlify.app${script}`)).status === 200
    : false
  log('SITE', `${state}; arquivos do site ${ok ? 'carregando' : 'NÃO carregam'}`)
}

await Promise.all([wants('api') ? publishApi() : null, wants('site') ? publishSite() : null])
