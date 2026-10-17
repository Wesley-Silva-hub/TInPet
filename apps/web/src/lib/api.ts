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

export const getAccessToken = () => accessToken

export function setSessionListener(listener: (session: AuthResponse | null) => void) {
  onSessionChange = listener
}

export function applySession(session: AuthResponse | null) {
  accessToken = session?.accessToken ?? null
  onSessionChange(session)
}

/** Renova a sessão pelo cookie. Chamadas simultâneas compartilham a mesma requisição. */
export function refreshSession(): Promise<AuthResponse | null> {
  refreshing ??= fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then(async (response) => {
      const session = response.ok ? ((await response.json()) as AuthResponse) : null
      applySession(session)
      return session
    })
    .catch(() => null)
    .finally(() => {
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
