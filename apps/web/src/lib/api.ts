import type { AuthResponse, ErrorResponse } from '@tinpet/shared'

const BASE = '/api/v1'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
  }
}

// O access token vive só em memória; o refresh token fica em cookie httpOnly.
let accessToken: string | null = null
let onSessionChange: (session: AuthResponse | null) => void = () => {}
let refreshing: Promise<AuthResponse | null> | null = null
/** Muda a cada login/logout: um refresh antigo não pode desfazer uma sessão mais nova. */
let sessionVersion = 0

/**
 * Marca (sem dado sensível) de que este navegador tinha sessão. Sem ela, as páginas públicas
 * abrem na hora em vez de esperar a API, que no plano grátis pode levar 1 min para acordar.
 */
const SESSION_HINT_KEY = 'tinpet:sessao'

/**
 * Espera entre tentativas de renovar a sessão enquanto a API acorda (o proxy do Netlify
 * devolve 502/504 depois de 26 s). Cobre pouco mais de 1 minuto.
 */
export const REFRESH_RETRY_DELAYS_MS = [2_000, 4_000, 8_000, 15_000, 15_000, 15_000]

export const getAccessToken = () => accessToken

export function hasSessionHint(): boolean {
  try {
    return window.localStorage.getItem(SESSION_HINT_KEY) === '1'
  } catch {
    return false
  }
}

function rememberSession(active: boolean) {
  try {
    if (active) window.localStorage.setItem(SESSION_HINT_KEY, '1')
    else window.localStorage.removeItem(SESSION_HINT_KEY)
  } catch {
    // Armazenamento bloqueado: só perde o atalho de abrir rápido
  }
}

export function setSessionListener(listener: (session: AuthResponse | null) => void) {
  onSessionChange = listener
}

export function applySession(session: AuthResponse | null) {
  accessToken = session?.accessToken ?? null
  sessionVersion++
  rememberSession(session !== null)
  onSessionChange(session)
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Chama o refresh; erro de rede ou 5xx (API acordando) tenta de novo. Null = servidor fora. */
async function requestRefresh(): Promise<Response | null> {
  for (const delay of [...REFRESH_RETRY_DELAYS_MS, null]) {
    try {
      const response = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      if (response.status < 500) return response
    } catch {
      // Rede caiu ou proxy cortou: tenta de novo abaixo
    }
    if (delay === null) return null
    await wait(delay)
  }
  return null
}

async function runRefresh(): Promise<AuthResponse | null> {
  const startedAt = sessionVersion
  const response = await requestRefresh()
  const session = response?.ok ? ((await response.json().catch(() => null)) as AuthResponse) : null
  if (session) {
    applySession(session)
    return session
  }
  // Login ou logout aconteceu enquanto esperava: vale o estado mais novo
  if (sessionVersion !== startedAt) return null
  if (response) {
    // A API respondeu que não há sessão válida
    applySession(null)
  } else {
    // Servidor indisponível: libera a tela, mas guarda a marca para tentar na próxima visita
    accessToken = null
    onSessionChange(null)
  }
  return null
}

/** Renova a sessão pelo cookie. Chamadas simultâneas compartilham a mesma requisição. */
export function refreshSession(): Promise<AuthResponse | null> {
  refreshing ??= runRefresh().finally(() => {
    refreshing = null
  })
  return refreshing
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Envia multipart (upload de imagem). */
  file?: Blob
  /** Campos de texto do multipart; vão antes do arquivo, como a API espera. */
  fields?: Record<string, string | null | undefined>
  query?: Record<string, string | number | undefined | null>
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const search = params.toString()
  return `${BASE}${path}${search ? `?${search}` : ''}`
}

async function send(path: string, options: RequestOptions) {
  const headers: Record<string, string> = {}
  if (accessToken) headers.authorization = `Bearer ${accessToken}`
  let body: BodyInit | undefined
  if (options.file) {
    const form = new FormData()
    for (const [name, value] of Object.entries(options.fields ?? {})) {
      if (value) form.append(name, value)
    }
    form.append('file', options.file, 'imagem.jpg')
    body = form
  } else if (options.body !== undefined) {
    headers['content-type'] = 'application/json'
    body = JSON.stringify(options.body)
  }
  return fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers,
    body,
    credentials: 'include',
  })
}

/** Cliente HTTP único: injeta o token, renova a sessão uma vez em caso de 401 e padroniza erros. */
async function request(path: string, options: RequestOptions): Promise<Response> {
  let response = await send(path, options)
  if (response.status === 401 && accessToken && !path.startsWith('/auth/')) {
    const session = await refreshSession()
    if (session) response = await send(path, options)
  }
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ErrorResponse | null
    throw new ApiError(
      response.status,
      payload?.error.code ?? 'NETWORK_ERROR',
      payload?.error.message ?? 'Não foi possível falar com o servidor',
      payload?.error.details,
    )
  }
  return response
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await request(path, options)
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export async function apiBlob(path: string): Promise<Blob> {
  return (await request(path, {})).blob()
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'Algo deu errado. Tente novamente.'
}
