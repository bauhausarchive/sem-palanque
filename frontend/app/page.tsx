'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, Database } from 'lucide-react'
import SearchBar from '@/components/SearchBar'
import PoliticoCard from '@/components/PoliticoCard'
import { searchPoliticos, getStats, getFeaturedPoliticos } from '@/lib/api'
import type { PoliticoSearchResult, Stats } from '@/lib/types'
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils'
import { featuredStaticPoliticos, searchStaticPoliticos } from '@/lib/static-politicos'
import Link from 'next/link'

const MOCK_STATS: Stats = {
  total_politicos: 513,
  total_condenados: 87,
  total_processos: 312,
  total_gastos_ceap: 285_000_000,
  ultima_atualizacao: new Date().toISOString(),
}

const DATA_SOURCES = [
  { name: 'Câmara dos Deputados', desc: 'Discursos, despesas CEAP e votações', url: 'https://dadosabertos.camara.leg.br' },
  { name: 'Senado Federal', desc: 'Discursos e proposições legislativas', url: 'https://legis.senado.leg.br/dadosabertos' },
  { name: 'TSE — Dados Eleitorais', desc: 'Candidaturas e declarações patrimoniais', url: 'https://dadosabertos.tse.jus.br' },
  { name: 'CNJ — Justiça Aberta', desc: 'Processos judiciais e condenações', url: 'https://www.cnj.jus.br/sistemas/justica-aberta' },
  { name: 'CNIA — CGU', desc: 'Cadastro de atos de improbidade', url: 'https://portaldatransparencia.gov.br/download-de-dados/cnia' },
  { name: 'TCU — Contas Públicas', desc: 'Acórdãos e irregularidades fiscais', url: 'https://portal.tcu.gov.br/dados-abertos' },
]

export default function HomePage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [featured, setFeatured] = useState<PoliticoSearchResult[]>([])
  const [searchResults, setSearchResults] = useState<PoliticoSearchResult[] | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    featuredStaticPoliticos(6).then(setFeatured)

    getStats()
      .then(setStats)
      .catch(() => setStats(MOCK_STATS))

    getFeaturedPoliticos()
      .then(setFeatured)
      .catch(() => undefined)
  }, [])

  async function handleSearchSelect(p: PoliticoSearchResult) {
    const res = await searchPoliticos(p.nome).catch(async () => ({ data: await searchStaticPoliticos(p.nome) }))
    setSearchResults(res.data)
    setSearchQuery(p.nome)
  }

  async function handleShowAll() {
    const allPoliticos = await featuredStaticPoliticos(513)
    setFeatured(allPoliticos)
  }

  const displayStats = stats ?? MOCK_STATS

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-black py-16 md:py-24 border-b border-[#1a1a1a]">
        <div className="container relative mx-auto px-4">
          <h1
            className="mb-6 text-5xl font-black uppercase tracking-tighter text-white md:text-7xl lg:text-8xl"
            style={{ fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif', lineHeight: 0.95 }}
          >
            SEM<br />
            <span className="text-[#FF2020]">PALANQUE.</span>
          </h1>
          <p className="mb-6 text-lg font-black uppercase tracking-widest text-white"
            style={{ fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif' }}
          >
            Os candidatos como eles são.
          </p>
          <p className="mb-10 max-w-xl text-sm font-medium text-[#FF2020]">
            Condenações, gastos do mandato e coerência de discurso.<br />
            Tudo com dados abertos do governo federal.
          </p>

          <div className="max-w-xl">
            <SearchBar autoFocus onSelect={handleSearchSelect} />
          </div>
              <p className="mt-3 text-xs font-medium text-white/40">
            Busque por nome, partido ou estado — ex: &ldquo;Silva SP&rdquo;, &ldquo;MDB&rdquo;
          </p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-black border-b border-[#1a1a1a]">
        <div className="container mx-auto px-4 py-0">
          <div className="grid grid-cols-2 divide-x divide-y divide-[#1a1a1a] sm:grid-cols-4 sm:divide-y-0">
            <StatCard
              color="#FF2020"
              value={formatNumber(displayStats.total_politicos)}
              label="POLÍTICOS MONITORADOS"
            />
            <StatCard
              color="#FF2020"
              value={formatNumber(displayStats.total_condenados)}
              label="COM CONDENAÇÕES"
            />
            <StatCard
              color="#1A6BFF"
              value="R$ 285MI"
              label="GASTOS COM VERBA PÚBLICA"
            />
            <StatCard
              color="#FFE500"
              value={formatNumber(displayStats.total_processos)}
              label="PROCESSOS ATIVOS"
            />
          </div>
        </div>
      </section>

      {/* Search results */}
      {searchResults && (
        <section className="container mx-auto px-4 py-12">
          <div className="mb-6 flex items-center gap-4">
            <div className="h-8 w-1 bg-[#FF2020]" />
            <h2
              className="text-4xl font-black uppercase tracking-widest text-white"
              style={{ fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif' }}
            >
              Resultados
            </h2>
            <span className="text-xs font-black uppercase tracking-widest text-white/40">
              {searchResults.length} encontrado{searchResults.length !== 1 ? 's' : ''} para &ldquo;{searchQuery}&rdquo;
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {searchResults.map((p) => (
              <PoliticoCard key={p.id} politico={p} />
            ))}
          </div>
        </section>
      )}

      {/* Featured politicians */}
      <section className="container mx-auto px-4 py-14">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-1 bg-[#FF2020]" />
            <h2
              className="text-4xl font-black uppercase tracking-widest text-white"
              style={{ fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif' }}
            >
              Em Destaque
            </h2>
          </div>
          <button
            type="button"
            onClick={handleShowAll}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#FF2020] hover:text-white transition-colors"
          >
            Ver todos <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p) => (
            <PoliticoCard key={p.id} politico={p} />
          ))}
        </div>
      </section>

      {/* Comparador CTA */}
      <section className="bg-[#FF2020] py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-black/60 mb-2">Ferramenta de IA</p>
              <h2
                className="text-4xl font-black uppercase tracking-tighter text-black sm:text-5xl"
                style={{ fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif', lineHeight: 0.95 }}
              >
                CONFRONTE O DISCURSO<br />
                COM A REALIDADE
              </h2>
            </div>
            <Link
              href="/comparador"
              className="flex-shrink-0 inline-flex items-center gap-2 bg-black px-6 py-4 text-sm font-black uppercase tracking-widest text-white hover:bg-[#FFE500] hover:text-black transition-colors"
            >
              Acessar Comparador
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Data sources */}
      <section id="fontes" className="container mx-auto px-4 py-14">
        <div className="mb-8 flex items-center gap-4">
          <Database className="h-5 w-5 text-[#1A6BFF]" />
          <h2
            className="text-4xl font-black uppercase tracking-widest text-white"
            style={{ fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif' }}
          >
            Fontes de Dados
          </h2>
        </div>
        <p className="mb-8 max-w-2xl text-sm font-medium text-white/50">
          Todos os dados são obtidos de fontes abertas oficiais do governo brasileiro. Nenhuma
          informação é produzida editorialmente — apenas consolidamos e cruzamos os dados públicos.
        </p>
        <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-[#1a1a1a]">
          {DATA_SOURCES.map((src) => (
            <a
              key={src.name}
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 border-b border-r border-[#1a1a1a] bg-black p-6 hover:bg-[#1a1a1a] transition-colors"
            >
              <div className="mt-1 h-2 w-2 flex-shrink-0 bg-[#1A6BFF]" />
              <div>
                <p className="text-sm font-bold text-white group-hover:text-[#1A6BFF] transition-colors">
                  {src.name}
                </p>
                <p className="text-xs font-medium text-white/40 mt-1">{src.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </section>
    </>
  )
}

function StatCard({
  color,
  value,
  label,
}: {
  color: string
  value: string
  label: string
}) {
  return (
    <div className="flex flex-col gap-1 py-6 px-4 sm:py-8 sm:px-6">
      <p
        className="text-5xl font-black tracking-tighter leading-none"
        style={{
          fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif',
          color,
        }}
      >
        {value}
      </p>
      <p className="text-xs font-black uppercase tracking-widest text-white/40 mt-2">{label}</p>
    </div>
  )
}
