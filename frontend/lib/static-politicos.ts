import type { Politico, PoliticoSearchResult } from './types'

let cache: Politico[] | null = null

async function fetchJson<T>(path: string): Promise<T[]> {
  const candidates = [`/sem-palanque${path}`, path]
  for (const url of candidates) {
    try {
      const res = await fetch(url)
      if (res.ok) return (await res.json()) as T[]
    } catch {
      // Try the next path. GitHub Pages uses /sem-palanque, local dev may not.
    }
  }
  return []
}

function normalizePolitico(p: Partial<Politico> & PoliticoSearchResult): Politico {
  return {
    id: p.id,
    nome: p.nome,
    nomeCivil: p.nomeCivil ?? p.nome,
    partido: p.partido,
    siglaUf: p.siglaUf,
    cargo: p.cargo,
    urlFoto: p.urlFoto,
    email: p.email,
    score_transparencia: p.score_transparencia,
    score_disponivel: p.score_disponivel ?? true,
    total_condenacoes: p.total_condenacoes,
    total_processos: p.total_processos ?? 0,
    total_gastos_ceap: p.total_gastos_ceap ?? 0,
    fonte_gastos: p.fonte_gastos,
    observacao_dados: p.observacao_dados,
    mandatos: p.mandatos ?? [
      {
        cargo: p.cargo,
        partido: p.partido,
        siglaUf: p.siglaUf,
        anoInicio: 2023,
      },
    ],
  }
}

export async function loadStaticPoliticos(): Promise<Politico[]> {
  if (cache) return cache
  const deputados = await fetchJson<Politico>('/data/deputados-enriquecidos.json')
  cache = deputados.map(normalizePolitico)
  return cache
}

export async function loadStaticPolitico(id: number): Promise<Politico | null> {
  const list = await loadStaticPoliticos()
  return list.find((p) => p.id === id) ?? null
}

export async function searchStaticPoliticos(query: string, limit = 20): Promise<PoliticoSearchResult[]> {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const list = await loadStaticPoliticos()
  return list
    .filter((p) =>
      p.nome.toLowerCase().includes(q) ||
      p.nomeCivil.toLowerCase().includes(q) ||
      p.partido.toLowerCase().includes(q) ||
      p.siglaUf.toLowerCase().includes(q) ||
      p.cargo.toLowerCase().includes(q)
    )
    .slice(0, limit)
}

export async function featuredStaticPoliticos(limit = 6): Promise<PoliticoSearchResult[]> {
  const list = await loadStaticPoliticos()
  return list.slice(0, limit)
}
