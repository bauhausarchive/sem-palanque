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
  ano_gastos?: number
  total_gastos_cota_parlamentar?: number
  quantidade_despesas?: number
  fonte_gastos?: string
}

async function fetchRankings(): Promise<DeputadoRanking[]> {
  const paths = [
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

  const maisGastos = useMemo(() => {
    return [...deputados]
      .sort(
        (a, b) =>
          (b.total_gastos_cota_parlamentar ?? 0) -
          (a.total_gastos_cota_parlamentar ?? 0)
      )
      .slice(0, 20)
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
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-widest text-[#1A6BFF]">
              Câmara dos Deputados / CEAP
            </p>
            <h2
              className="text-4xl font-black uppercase tracking-tighter text-white md:text-5xl"
              style={{
                fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif',
                lineHeight: 0.95,
              }}
            >
              Mais gastos de<br />
              Cota Parlamentar
            </h2>
          </div>

          <div className="hidden text-right sm:block">
            <p className="text-xs font-black uppercase tracking-widest text-white/40">
              Ano-base
            </p>
            <p className="text-3xl font-black text-[#FF2020]">2024</p>
          </div>
        </div>

        <div className="border-t border-[#1a1a1a]">
          {maisGastos.map((p, index) => (
            <Link
              key={p.id}
              href={`/politico/index?id=${p.id}`}
              className="group grid grid-cols-[48px_1fr] gap-4 border-b border-[#1a1a1a] py-5 transition-colors hover:bg-[#0a0a0a] sm:grid-cols-[64px_72px_1fr_220px]"
            >
              <div
                className="text-4xl font-black leading-none text-white/20 group-hover:text-[#FF2020]"
                style={{ fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif' }}
              >
                {String(index + 1).padStart(2, '0')}
              </div>

              <div className="hidden sm:block">
                {p.urlFoto ? (
                  <img
                    src={p.urlFoto}
                    alt={p.nome}
                    className="h-16 w-16 object-cover object-top grayscale"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center bg-[#1a1a1a] text-2xl font-black text-white/30">
                    {p.nome.charAt(0)}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xl font-black uppercase tracking-tight text-white group-hover:text-[#FF2020]">
                  {p.nome}
                </h3>
                <p className="mt-1 text-xs font-black uppercase tracking-widest text-white/40">
                  {p.partido} / {p.siglaUf} · {p.quantidade_despesas ?? 0} despesas
                </p>
              </div>

              <div className="col-span-2 flex items-center justify-between sm:col-span-1 sm:justify-end sm:text-right">
                <div>
                  <p className="text-2xl font-black text-[#1A6BFF]">
                    {formatCurrency(p.total_gastos_cota_parlamentar ?? 0)}
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30">
                    Cota Parlamentar
                  </p>
                </div>
                <ArrowRight className="ml-4 h-4 w-4 text-white/20 group-hover:text-white sm:hidden" />
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-4 text-xs font-medium text-white/35">
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
