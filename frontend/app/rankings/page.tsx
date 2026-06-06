'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

type DeputadoRanking = {
  id: number
  nome: string
  partido: string
  siglaUf: string
  urlFoto?: string
  total_gastos_cota_parlamentar?: number
  quantidade_despesas?: number
  total_divulgacao?: number
  total_combustiveis?: number
  total_passagens_aereas?: number
  total_aluguel_veiculos?: number
}

async function fetchRankings(): Promise<DeputadoRanking[]> {
  const paths = [
    '/sem-palanque/data/deputados-gastos-tipos.json',
    '/data/deputados-gastos-tipos.json',
    '/sem-palanque/data/deputados-enriquecidos.json',
    '/data/deputados-enriquecidos.json',
  ]

  for (const path of paths) {
    try {
      const res = await fetch(path)
      if (res.ok) return await res.json()
    } catch {}
  }

  return []
}

export default function RankingsPage() {
  const [deputados, setDeputados] = useState<DeputadoRanking[]>([])

  useEffect(() => {
    fetchRankings().then(setDeputados)
  }, [])

  const rankings = useMemo(() => {
    return [
      {
        title: 'Mais gastos de Cota Parlamentar',
        eyebrow: 'Câmara dos Deputados / CEAP',
        field: 'total_gastos_cota_parlamentar' as keyof DeputadoRanking,
        color: '#1A6BFF',
        note: 'Total de despesas líquidas da Cota para o Exercício da Atividade Parlamentar em 2024.',
      },
      {
        title: 'Mais gastos com Divulgação',
        eyebrow: 'Divulgação da atividade parlamentar',
        field: 'total_divulgacao' as keyof DeputadoRanking,
        color: '#FF2020',
        note: 'Gastos classificados pela Câmara como divulgação da atividade parlamentar.',
      },
      {
        title: 'Mais gastos com Combustíveis',
        eyebrow: 'Combustíveis e lubrificantes',
        field: 'total_combustiveis' as keyof DeputadoRanking,
        color: '#FFE500',
        note: 'Gastos classificados pela Câmara como combustíveis e lubrificantes.',
      },
      {
        title: 'Mais gastos com Passagens Aéreas',
        eyebrow: 'Passagens aéreas',
        field: 'total_passagens_aereas' as keyof DeputadoRanking,
        color: '#1A6BFF',
        note: 'Inclui despesas de passagem aérea registradas na base oficial da Câmara.',
      },
      {
        title: 'Mais gastos com Veículos',
        eyebrow: 'Locação ou fretamento de veículos',
        field: 'total_aluguel_veiculos' as keyof DeputadoRanking,
        color: '#FF2020',
        note: 'Gastos classificados como locação ou fretamento de veículos automotores.',
      },
    ].map((ranking) => ({
      ...ranking,
      data: [...deputados]
        .sort((a, b) => Number(b[ranking.field] ?? 0) - Number(a[ranking.field] ?? 0))
        .slice(0, 10),
    }))
  }, [deputados])

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

          <p className="mb-3 text-xs font-black uppercase tracking-widest text-[#FF2020]">
            Rankings oficiais
          </p>

          <h1
            className="text-5xl font-black uppercase tracking-tighter text-white md:text-7xl"
            style={{
              fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif',
              lineHeight: 0.9,
            }}
          >
            Quem mais<br />
            aparece nos dados
          </h1>

          <p className="mt-6 max-w-2xl text-sm font-medium text-white/50">
            Rankings construídos apenas com bases oficiais e auditáveis. Quando uma base
            ainda não está integrada, o Sem Palanque não inventa dado.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="grid gap-6 lg:grid-cols-2">
          {rankings.map((ranking) => (
            <RankingBlock
              key={ranking.title}
              title={ranking.title}
              eyebrow={ranking.eyebrow}
              color={ranking.color}
              note={ranking.note}
              field={ranking.field}
              data={ranking.data}
            />
          ))}
        </div>

        <p className="mt-6 text-xs font-medium text-white/35">
          Fonte: Câmara dos Deputados — Dados Abertos / Cota para o Exercício da
          Atividade Parlamentar. Valores calculados a partir de despesas líquidas de 2024.
        </p>
      </section>

      <section className="container mx-auto grid gap-4 px-4 pb-16 md:grid-cols-3">
        <PendingRanking
          title="Mais ausentes em votações nominais"
          source="Fonte prevista: Câmara dos Deputados"
          text="Em integração. O ranking só será publicado quando o critério oficial de ausência estiver definido e auditável."
        />
        <PendingRanking
          title="Mais registros de condenações e inelegibilidade"
          source="Fontes previstas: CNJ, TCU e TSE"
          text="Em integração. Condenações, improbidade, contas irregulares e inelegibilidade serão separadas por tipo de registro."
        />
        <PendingRanking
          title="Processos"
          source="Fonte prevista: DataJud / CNJ"
          text="Em integração. Processos exigem desambiguação por nome, CPF quando disponível, tribunal, classe processual e status."
        />
      </section>
    </main>
  )
}

function RankingBlock({
  title,
  eyebrow,
  color,
  note,
  field,
  data,
}: {
  title: string
  eyebrow: string
  color: string
  note: string
  field: keyof DeputadoRanking
  data: DeputadoRanking[]
}) {
  return (
    <div className="border border-[#1a1a1a] bg-[#050505]">
      <div className="border-b border-[#1a1a1a] p-6">
        <p
          className="mb-2 text-xs font-black uppercase tracking-widest"
          style={{ color }}
        >
          {eyebrow}
        </p>
        <h2
          className="text-3xl font-black uppercase tracking-tighter text-white"
          style={{
            fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif',
            lineHeight: 0.95,
          }}
        >
          {title}
        </h2>
        <p className="mt-3 text-xs font-medium leading-relaxed text-white/40">
          {note}
        </p>
      </div>

      <div>
        {data.map((p, index) => {
          const value = Number(p[field] ?? 0)

          return (
            <Link
              key={`${title}-${p.id}`}
              href={`/politico/index?id=${p.id}`}
              className="group grid grid-cols-[40px_1fr] gap-3 border-b border-[#1a1a1a] p-4 transition-colors last:border-b-0 hover:bg-[#0a0a0a] sm:grid-cols-[44px_52px_1fr]"
            >
              <div
                className="text-2xl font-black leading-none text-white/20 group-hover:text-white"
                style={{ fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif' }}
              >
                {String(index + 1).padStart(2, '0')}
              </div>

              <div className="hidden sm:block">
                {p.urlFoto ? (
                  <img
                    src={p.urlFoto}
                    alt={p.nome}
                    className="h-12 w-12 object-cover object-top grayscale"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center bg-[#1a1a1a] text-xl font-black text-white/30">
                    {p.nome.charAt(0)}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <h3 className="truncate text-sm font-black uppercase tracking-tight text-white group-hover:text-[#FF2020]">
                  {p.nome}
                </h3>
                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/35">
                  {p.partido} / {p.siglaUf}
                </p>
                <p
                  className="mt-2 text-xl font-black tracking-tight"
                  style={{
                    color,
                    fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif',
                  }}
                >
                  {formatCurrency(value).replace(',00', '')}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function PendingRanking({
  title,
  source,
  text,
}: {
  title: string
  source: string
  text: string
}) {
  return (
    <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-6">
      <p className="mb-3 text-xs font-black uppercase tracking-widest text-[#FF2020]">
        Em integração
      </p>
      <h3 className="text-2xl font-black uppercase tracking-tight text-white">
        {title}
      </h3>
      <p className="mt-4 text-xs font-black uppercase tracking-widest text-white/40">
        {source}
      </p>
      <p className="mt-4 text-sm font-medium leading-relaxed text-white/45">
        {text}
      </p>
    </div>
  )
}
