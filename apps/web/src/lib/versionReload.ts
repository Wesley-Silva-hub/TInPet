/**
 * Depois de um deploy, abas abertas com a versão antiga pedem arquivos (chunks) que não existem
 * mais. Nesse caso a página é recarregada uma única vez para buscar a versão nova; a marca na
 * sessão evita loop caso o erro persista por outro motivo.
 */
const RELOAD_KEY = 'tinpet:recarregou-versao'
const RELOAD_WINDOW_MS = 30_000

const CHUNK_ERROR = [
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
  /unable to preload css/i,
  /falha ao buscar o módulo importado dinamicamente/i,
]

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return CHUNK_ERROR.some((pattern) => pattern.test(message))
}

/** Recarrega se ainda não recarregou há pouco. Retorna true se vai recarregar. */
export function reloadForNewVersion(storage?: Storage, reload = () => window.location.reload()) {
  try {
    // Acessar sessionStorage pode lançar exceção quando o navegador bloqueia o armazenamento
    const store = storage ?? window.sessionStorage
    const last = Number(store.getItem(RELOAD_KEY) ?? 0)
    if (Date.now() - last < RELOAD_WINDOW_MS) return false
    store.setItem(RELOAD_KEY, String(Date.now()))
  } catch {
    // Sem sessionStorage (modo privado restrito): recarrega mesmo assim, sem proteção extra
  }
  reload()
  return true
}
