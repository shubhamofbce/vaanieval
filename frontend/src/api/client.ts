const API_BASE = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.PROD ? '/api/v1' : 'http://localhost:8000/api/v1')

type RequestOptions = RequestInit & { skipJson?: boolean }

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  })

  if (!response.ok) {
    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const body = await response.json()
      throw new Error(body.detail ?? body.message ?? 'Request failed')
    }
    throw new Error(await response.text())
  }

  if (options.skipJson || response.status === 204) {
    return {} as T
  }

  return (await response.json()) as T
}

export { API_BASE }
