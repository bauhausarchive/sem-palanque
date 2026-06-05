import type {
  Politico,
  PoliticoSearchResult,
  Discurso,
  Promessa,
  ComparacaoResult,
  Gasto,
  GastoResumido,
  GastosPorMes,
  Condenacao,
  Stats,
  ApiResponse,
} from './types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`API error ${res.status}: ${error}`)
  }

  return res.json()
}

// ── Politicos ────────────────────────────────────────────────────────────────

export async function searchPoliticos(
  query: string,
  page = 1,
  perPage = 20
): Promise<ApiResponse<PoliticoSearchResult[]>> {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    per_page: String(perPage),
  })
  return fetchApi<ApiResponse<PoliticoSearchResult[]>>(`/politicos?${params}`)
}

export async function getPolitico(id: number): Promise<Politico> {
  return fetchApi<Politico>(`/politicos/${id}`)
}

export async function getFeaturedPoliticos(): Promise<PoliticoSearchResult[]> {
  return fetchApi<PoliticoSearchResult[]>('/politicos/destaque')
}

export async function getStats(): Promise<Stats> {
  return fetchApi<Stats>('/stats')
}

// ── Discursos ────────────────────────────────────────────────────────────────

export async function getDiscursos(
  politicoId: number,
  page = 1,
  perPage = 10,
  dataInicio?: string,
  dataFim?: string
): Promise<ApiResponse<Discurso[]>> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  })
  if (dataInicio) params.set('data_inicio', dataInicio)
  if (dataFim) params.set('data_fim', dataFim)
  return fetchApi<ApiResponse<Discurso[]>>(
    `/politicos/${politicoId}/discursos?${params}`
  )
}

export async function compararDiscursos(payload: {
  politico_id: number
  promessas: string[]
  discursos_ids?: number[]
  youtube_links?: string[]
}): Promise<ComparacaoResult[]> {
  return fetchApi<ComparacaoResult[]>('/discursos/comparar', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getPromessas(politicoId: number): Promise<Promessa[]> {
  return fetchApi<Promessa[]>(`/politicos/${politicoId}/promessas`)
}

// ── Gastos ───────────────────────────────────────────────────────────────────

export async function getGastos(
  politicoId: number,
  ano?: number,
  mes?: number,
  page = 1,
  perPage = 20
): Promise<ApiResponse<Gasto[]>> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  })
  if (ano) params.set('ano', String(ano))
  if (mes) params.set('mes', String(mes))
  return fetchApi<ApiResponse<Gasto[]>>(
    `/politicos/${politicoId}/gastos?${params}`
  )
}

export async function getGastosResumidos(
  politicoId: number,
  ano?: number
): Promise<GastoResumido[]> {
  const params = ano ? `?ano=${ano}` : ''
  return fetchApi<GastoResumido[]>(
    `/politicos/${politicoId}/gastos/resumo${params}`
  )
}

export async function getGastosPorMes(
  politicoId: number,
  anos?: number[]
): Promise<GastosPorMes[]> {
  const params = anos ? `?anos=${anos.join(',')}` : ''
  return fetchApi<GastosPorMes[]>(
    `/politicos/${politicoId}/gastos/por-mes${params}`
  )
}

// ── Condenações ──────────────────────────────────────────────────────────────

export async function getCondenacoes(
  politicoId: number
): Promise<Condenacao[]> {
  return fetchApi<Condenacao[]>(`/politicos/${politicoId}/condenacoes`)
}
