'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Search } from 'lucide-react'
import PoliticoCard from '@/components/PoliticoCard'
import { featuredStaticPoliticos, loadStaticPoliticos } from '@/lib/static-politicos'
import type { PoliticoSearchResult } from '@/lib/types'
import { formatCurrency, formatNumber } from '@/lib/utils'

const MOCK_STATS = {
  total_politicos: 513,
  total_condenados: 87,
  total_gastos_ceap: 285000000,
  total_processos: 312,
}

export default function Home() {
  const [featured, setFeatured] = useState<PoliticoSearchResult[]>([])
  const [allPoliticos, setAllPoliticos] = useState<PoliticoSearchResult[]>([])
  const [query, setQuery] = useState('')
  const [uf, setUf] = useState('TODOS')
  const [partido, setPartido] = useState('TODOS')

  useEffect(() => {
    featuredStaticPoliticos(6).then(setFeatured)
    loadStaticPoliticos().then(setAllPoliticos)
  }, [])

  const ufs = useMemo(() => {
    return ['TODOS', ...Array.from(new Set(allPoliticos.map((p) => p.siglaUf))).sort()]
  }, [allPoliticos])

  const partidos = useMemo(() => {
    return ['TODOS', ...Array.from(new Set(allPoliticos.map((p) => p.partido))).sort()]
  }, [allPoliticos])

  const filteredPoliticos = useMemo(() => {
    const q = query.trim().toLowerCase()

    const filtered = allPoliticos.filter((p) => {
      const matchQuery =
        !q ||
        p.nome.toLowerCase().includes(q) ||
        p.partido.toLowerCase().includes(q) ||
        p.siglaUf.toLowerCase().includes(q)

      const matchUf = uf === 'TODOS' || p.siglaUf === uf
      const matchPartido = partido === 'TODOS' || p.partido === partido

      return matchQuery && matchUf && matchPartido
    })

    if (q || uf !== 'TODOS' || partido !== 'TODOS') {
      return filtered.slice(0, 12)
    }

    return featured
  }, [allPoliticos, featured, query, uf, partido])

  const hasActiveFilter = query.trim() || uf !== 'TODOS' || partido !== 'TODOS'

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-black pt-16 pb-8 md:pt-24 md:pb-8 border-b border-[#1a1a1a]">
        <div className="container relative mx-auto px-4">
          <h1
            className="mb-6 text-5xl font-black uppercase tracking-tighter text-white md:text-7xl lg:text-8xl"
            style={{ fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif', lineHeight: 0.95 }}
          >
            SEM<br />
            <span className="text-[#FF2020]">PALANQUE.</span>
          </h1>

          <p
            className="mb-6 text-lg font-black uppercase tracking-widest text-white"
            style={{ fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif' }}
          >
            Os candidatos como eles são.
          </p>

          <p className="mb-10 max-w-xl text-sm font-medium text-[#FF2020]">
            Condenações, gastos do mandato e coerência de discurso.<br />
            Tudo com dados abertos do governo federal.
          </p>

          <div className="flex max-w-3xl flex-col gap-3 sm:flex-row">
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar político por nome..."
                className="h-[58px] w-full border-2 border-[#A3A3A3] bg-black pl-12 pr-4 text-sm font-medium text-white placeholder:text-white/30 focus:outline-none focus:border-white"
              />
            </div>

            <select
              value={uf}
              onChange={(e) => setUf(e.target.value)}
              className="h-[58px] border-2 border-[#A3A3A3] bg-black px-6 text-xs font-black uppercase tracking-widest text-white focus:outline-none focus:border-white sm:w-40"
            >
              {ufs.map((item) => (
                <option key={item} value={item}>
                  {item === 'TODOS' ? 'UF' : item}
                </option>
              ))}
            </select>

            <select
              value={partido}
              onChange={(e) => setPartido(e.target.value)}
              className="h-[58px] border-2 border-[#A3A3A3] bg-black px-6 text-xs font-black uppercase tracking-widest text-white focus:outline-none focus:border-white sm:w-52"
            >
              {partidos.map((item) => (
                <option key={item} value={item}>
                  {item === 'TODOS' ? 'PARTIDO' : item}
                </option>
              ))}
            </select>
          </div>

          <p className="mt-3 text-xs font-medium text-white/40">
            Busque por nome, partido ou estado — ex: “Silva SP”, “MDB”
          </p>

          <div className="mt-12">
            <Link
              href="/rankings"
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#1A6BFF] hover:text-white transition-colors"
            >
              Ver rankings <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-black border-b border-[#1a1a1a]">
        <div className="container mx-auto px-4 py-0">
          <div className="grid grid-cols-2 divide-x divide-y divide-[#1a1a1a] sm:grid-cols-4 sm:divide-y-0">
            <StatCard
              value={formatNumber(MOCK_STATS.total_politicos)}
              label="Políticos monitorados"
              color="#FF2020"
            />
            <StatCard
              value={formatNumber(MOCK_STATS.total_condenados)}
              label="Com condenações"
              color="#FF2020"
            />
            <StatCard
              value="R$ 285MI"
              label="Gastos com verba pública"
              color="#1A6BFF"
            />
            <StatCard
              value={formatNumber(MOCK_STATS.total_processos)}
              label="Processos ativos"
              color="#FFE500"
            />
          </div>
        </div>
      </section>

      {/* Cards */}
      <section className="container mx-auto px-4 py-16">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/politicos"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#FF2020] hover:text-white transition-colors"
          >
            Explorar políticos <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setUf('TODOS')
                setPartido('TODOS')
              }}
              className="text-xs font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {filteredPoliticos.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPoliticos.map((p) => (
              <PoliticoCard key={p.id} politico={p} />
            ))}
          </div>
        ) : (
          <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-10 text-center">
            <p className="text-sm font-medium text-white/50">
              Nenhum político encontrado com esses filtros.
            </p>
          </div>
        )}
      </section>

      {/* Comparador CTA */}
      <section className="bg-[#FF2020] py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-3 text-xs font-black uppercase tracking-widest text-black/60">
                Ferramenta de IA
              </p>
              <h2
                className="text-4xl font-black uppercase tracking-tighter text-black md:text-6xl"
                style={{ fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif', lineHeight: 0.95 }}
              >
                Confronte o discurso<br />
                com a realidade
              </h2>
            </div>

            <Link
              href="/comparador"
              className="inline-flex items-center gap-2 bg-black px-6 py-4 text-sm font-black uppercase tracking-widest text-white hover:bg-[#FFE500] hover:text-black transition-colors"
            >
              Acessar comparador <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

function StatCard({
  value,
  label,
  color,
}: {
  value: string
  label: string
  color: string
}) {
  return (
    <div className="py-10 px-6">
      <p
        className="text-4xl font-black tracking-tighter md:text-5xl"
        style={{
          color,
          fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif',
        }}
      >
        {value}
      </p>
      <p className="mt-3 text-xs font-black uppercase tracking-widest text-white/40">
        {label}
      </p>
    </div>
  )
}
