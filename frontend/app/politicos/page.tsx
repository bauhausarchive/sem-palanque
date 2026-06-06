'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search } from 'lucide-react'
import PoliticoCard from '@/components/PoliticoCard'
import { loadStaticPoliticos } from '@/lib/static-politicos'
import type { PoliticoSearchResult } from '@/lib/types'

export default function PoliticosPage() {
  const [politicos, setPoliticos] = useState<PoliticoSearchResult[]>([])
  const [query, setQuery] = useState('')
  const [uf, setUf] = useState('TODOS')
  const [partido, setPartido] = useState('TODOS')

  useEffect(() => {
    loadStaticPoliticos().then(setPoliticos)
  }, [])

  const ufs = useMemo(() => {
    return ['TODOS', ...Array.from(new Set(politicos.map((p) => p.siglaUf))).sort()]
  }, [politicos])

  const partidos = useMemo(() => {
    return ['TODOS', ...Array.from(new Set(politicos.map((p) => p.partido))).sort()]
  }, [politicos])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    return politicos.filter((p) => {
      const matchQuery =
        !q ||
        p.nome.toLowerCase().includes(q) ||
        p.partido.toLowerCase().includes(q) ||
        p.siglaUf.toLowerCase().includes(q)

      const matchUf = uf === 'TODOS' || p.siglaUf === uf
      const matchPartido = partido === 'TODOS' || p.partido === partido

      return matchQuery && matchUf && matchPartido
    })
  }, [politicos, query, uf, partido])

  return (
    <main className="min-h-screen bg-black">
      <section className="border-b border-[#1a1a1a] bg-black py-10">
        <div className="container mx-auto px-4">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>

          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-black uppercase tracking-widest text-[#FF2020]">
                Base Câmara dos Deputados
              </p>
              <h1
                className="text-5xl font-black uppercase tracking-tighter text-white md:text-7xl"
                style={{ fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif', lineHeight: 0.9 }}
              >
                Todos os<br />
                Deputados
              </h1>
            </div>

            <div className="text-left md:text-right">
              <p className="text-5xl font-black tracking-tighter text-[#FF2020]">
                {filtered.length}
              </p>
              <p className="text-xs font-black uppercase tracking-widest text-white/40">
                deputados encontrados
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_160px_200px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome, partido ou estado"
                className="w-full border-2 border-[#A3A3A3] bg-black py-4 pl-12 pr-4 text-sm font-medium text-white placeholder:text-white/30 focus:outline-none focus:border-white"
              />
            </div>

            <select
              value={uf}
              onChange={(e) => setUf(e.target.value)}
              className="border-2 border-[#A3A3A3] bg-black px-4 py-4 text-sm font-black uppercase tracking-widest text-white focus:outline-none focus:border-white"
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
              className="border-2 border-[#A3A3A3] bg-black px-4 py-4 text-sm font-black uppercase tracking-widest text-white focus:outline-none focus:border-white"
            >
              {partidos.map((item) => (
                <option key={item} value={item}>
                  {item === 'TODOS' ? 'Partido' : item}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <PoliticoCard key={p.id} politico={p} />
            ))}
          </div>
        ) : (
          <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-10 text-center">
            <p className="text-sm font-medium text-white/50">
              Nenhum deputado encontrado com esses filtros.
            </p>
          </div>
        )}
      </section>
    </main>
  )
}
