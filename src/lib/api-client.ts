import { configValidator } from './config-validator'

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface ApiRequestOptions {
  method?: string
  headers?: HeadersInit
  body?: BodyInit | Record<string, unknown> | null
  query?: Record<string, string | number | boolean | undefined>
  signal?: AbortSignal
  token?: string | null
  includeCredentials?: boolean
}

const normalizePath = (base: string, path: string) => {
  if (!path) return base
  if (path.startsWith('http')) return path
  if (path.startsWith('/')) return `${base}${path}`
  return `${base}/${path}`
}

export function isBackendEnabled(): boolean {
  const config = configValidator.getConfig()
  return Boolean(config.apiBaseUrl && config.features.backendAuth)
}

export async function apiRequest<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const config = configValidator.getConfig()

  if (!config.apiBaseUrl) {
    throw new Error('API base URL is not configured')
  }

  const url = new URL(normalizePath(config.apiBaseUrl, path))

  if (options.query) {
    Object.entries(options.query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return
      url.searchParams.set(key, String(value))
    })
  }

  const headers = new Headers(options.headers || {})

  if (config.apiKey && !headers.has('X-API-Key')) {
    headers.set('X-API-Key', config.apiKey)
  }

  if (options.token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${options.token}`)
  }

  const isJsonBody = options.body && !(options.body instanceof FormData) && !(options.body instanceof Blob)

  if (isJsonBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers,
    body: isJsonBody ? JSON.stringify(options.body) : (options.body as BodyInit | null | undefined),
    signal: options.signal,
    credentials: options.includeCredentials === false ? 'omit' : 'include',
  })

  if (!response.ok) {
    let errorMessage = response.statusText
    let details: unknown
    try {
      const parsed = await response.json()
      errorMessage = parsed.error || parsed.message || errorMessage
      details = parsed
    } catch {
      // ignore JSON parsing errors
    }
    throw new ApiError(response.status, errorMessage, details)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get('Content-Type') || ''
  if (contentType.includes('application/json')) {
    return (await response.json()) as T
  }

  // Fallback to text for non-JSON responses
  return (await response.text()) as unknown as T
}
