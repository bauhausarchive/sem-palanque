'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ExternalLink,
  Calendar,
  Loader2,
  Share2,
  ChevronDown,
  Search,
} from 'lucide-react'
import { GastoBarChart, GastoPieChart } from '@/components/GastoChart'
import ShareStoryModal from '@/components/ShareStoryModal'
import DiscursoComparador from '@/components/DiscursoComparador'
import {
  getPolitico,
  getCondenacoes,
  getGastos,
  getGastosResumidos,
  getGastosPorMes,
  getDiscursos,
  getPromessas,
  compararDiscursos,
} from '@/lib/api'
import type {
  Politico,
  Condenacao,
  Gasto,
  GastoResumido,
  GastosPorMes,
  Discurso,
  ComparacaoResult,
} from '@/lib/types'
import {
  cn,
  formatCurrency,
  formatDate,
  cargoLabel,
} from '@/lib/utils'

type Tab = 'resumo' | 'condenacoes' | 'gastos' | 'discursos'

const TABS: { id: Tab; label: string }[] = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'condenacoes', label: 'Condenações' },
  { id: 'gastos', label: 'Gastos CEAP' },
  { id: 'discursos', label: 'Discursos' },
]

function getScoreColor(score: number): string {
  if (score >= 70) return '#1A6BFF'
  if (score >= 40) return '#FFE500'
  return '#FF2020'
}

function getStatusBadge(politico: Politico): { text: string; bg: string; textColor: string } {
  if (politico.total_condenacoes > 0) return { text: 'CONDENADO', bg: '#FF2020', textColor: '#fff' }
  if (politico.score_transparencia >= 70) return { text: 'FICHA LIMPA', bg: '#1A6BFF', textColor: '#fff' }
  return { text: 'INVESTIGADO', bg: '#FFE500', textColor: '#000' }
}

export default function PoliticoPage() {
  const params = useParams<{ slug: string[] }>()
  const politicoId = Number(params.slug?.[0])

  const [activeTab, setActiveTab] = useState<Tab>('resumo')
  const [showStoryModal, setShowStoryModal] = useState(false)
  const [politico, setPolitico] = useState<Politico | null>(null)
  const [condenacoes, setCondenacoes] = useState<Condenacao[]>([])
  const [gastosResumo, setGastosResumo] = useState<GastoResumido[]>([])
  const [gastosMes, setGastosMes] = useState<GastosPorMes[]>([])
  const [gastosItens, setGastosItens] = useState<Gasto[]>([])
  const [gastosSearch, setGastosSearch] = useState('')
  const [gastosOrdem, setGastosOrdem] = useState<'valor' | 'data'>('valor')
  const [discursos, setDiscursos] = useState<Discurso[]>([])
  const [comparacoes, setComparacoes] = useState<ComparacaoResult[]>([])
  const [loading, setLoading] = useState(true)
  const [tabLoading, setTabLoading] = useState(false)

  useEffect(() => {
    getPolitico(politicoId)
      .then(setPolitico)
      .catch(() => {
        setPolitico({
          id: politicoId,
          nome: 'João da Silva',
          nomeCivil: 'João Augusto da Silva',
          partido: 'PDT',
          siglaUf: 'SP',
          cargo: 'DEPUTADO_FEDERAL',
          legislaturaAtual: 57,
          score_transparencia: 35,
          total_condenacoes: 2,
          total_processos: 5,
          total_gastos_ceap: 120_000,
          mandatos: [
            { cargo: 'DEPUTADO_FEDERAL', partido: 'PDT', siglaUf: 'SP', anoInicio: 2019 },
            { cargo: 'VEREADOR', partido: 'PDT', siglaUf: 'SP', anoInicio: 2013, anoFim: 2016 },
          ],
        })
      })
      .finally(() => setLoading(false))
  }, [politicoId])

  useEffect(() => {
    async function loadTab() {
      setTabLoading(true)
      try {
        if (activeTab === 'condenacoes' && condenacoes.length === 0) {
          const data = await getCondenacoes(politicoId).catch(() => MOCK_CONDENACOES)
          setCondenacoes(data)
        }
        if (activeTab === 'gastos' && gastosResumo.length === 0) {
          const [resumo, mes, itens] = await Promise.all([
            getGastosResumidos(politicoId).catch(() => MOCK_GASTOS_RESUMO),
            getGastosPorMes(politicoId).catch(() => MOCK_GASTOS_MES),
            getGastos(politicoId).catch(() => ({ data: MOCK_GASTOS_ITENS, total: MOCK_GASTOS_ITENS.length })),
          ])
          setGastosResumo(resumo)
          setGastosMes(mes)
          setGastosItens(itens.data)
        }
        if (activeTab === 'discursos' && discursos.length === 0) {
          const [disc, promessas] = await Promise.all([
            getDiscursos(politicoId).catch(() => ({ data: MOCK_DISCURSOS, total: 3 })),
            getPromessas(politicoId).catch(() => MOCK_PROMESSAS),
          ])
          setDiscursos(disc.data)
          if (promessas.length > 0) {
            const comp = await compararDiscursos({
              politico_id: politicoId,
              promessas: promessas.map((p) => p.descricao),
            }).catch(() => MOCK_COMPARACOES)
            setComparacoes(comp)
          }
        }
      } finally {
        setTabLoading(false)
      }
    }
    if (!loading) loadTab()
  }, [activeTab, loading, politicoId])

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF2020]" />
      </div>
    )
  }

  if (!politico) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-white/50 mb-4">Político não encontrado.</p>
        <Link href="/" className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-[#FF2020] hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      </div>
    )
  }

  const scoreColor = getScoreColor(politico.score_transparencia)
  const badge = getStatusBadge(politico)

  return (
    <div className="bg-black min-h-screen">
      {/* Back */}
      <div className="container mx-auto px-4 pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar à busca
        </Link>
      </div>

      {/* Profile header */}
      <div className="border-b border-[#1a1a1a] bg-[#0a0a0a] mt-6">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col gap-6">
            {/* Name row */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <span
                    className="px-2 py-0.5 text-xs font-black uppercase tracking-widest"
                    style={{ background: badge.bg, color: badge.textColor }}
                  >
                    {badge.text}
                  </span>
                  <span className="px-2 py-0.5 bg-[#1a1a1a] text-xs font-black uppercase tracking-widest text-white">
                    {politico.partido}
                  </span>
                  <span className="px-2 py-0.5 bg-[#1a1a1a] text-xs font-black uppercase tracking-widest text-white">
                    {politico.siglaUf}
                  </span>
                  <span className="text-xs font-black uppercase tracking-widest text-white/40">
                    {cargoLabel(politico.cargo)}
                  </span>
                </div>
                <h1
                  className="text-4xl font-black uppercase tracking-tighter text-white leading-none md:text-6xl"
                  style={{ fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif' }}
                >
                  {politico.nome}
                </h1>
                {politico.nomeCivil && politico.nomeCivil !== politico.nome && (
                  <p className="text-sm text-white/40 mt-2">{politico.nomeCivil}</p>
                )}
                {/* Share button — mobile (shown inline below name) */}
                <button
                  onClick={() => setShowStoryModal(true)}
                  className="mt-4 sm:hidden flex items-center gap-2 border-2 border-white bg-black px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-white hover:text-black"
                >
                  <Share2 className="h-4 w-4" />
                  Compartilhar
                </button>
              </div>

              {/* Score block + share button (desktop) */}
              <div className="flex-shrink-0 flex flex-col gap-3">
                <button
                  onClick={() => setShowStoryModal(true)}
                  className="hidden sm:flex items-center justify-center gap-2 border-2 border-white bg-black px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-white hover:text-black"
                >
                  <Share2 className="h-4 w-4" />
                  Compartilhar
                </button>
                <div className="border border-[#1a1a1a] p-5 min-w-[160px]">
                  <p className="text-xs font-black uppercase tracking-widest text-white/40 mb-1">Transparência</p>
                  <div
                    className="text-7xl font-black leading-none tracking-tighter"
                    style={{
                      fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif',
                      color: scoreColor,
                    }}
                  >
                    {politico.score_transparencia}
                  </div>
                  <div className="mt-3 h-2 w-full bg-[#1a1a1a]">
                    <div
                      className="h-full"
                      style={{ width: `${politico.score_transparencia}%`, background: scoreColor }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#1a1a1a] bg-black sticky top-14 z-40">
        <div className="container mx-auto px-4">
          <div className="flex overflow-x-auto whitespace-nowrap scrollbar-none">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-shrink-0 px-5 py-4 text-xs font-black uppercase tracking-widest transition-colors border-b-[3px]',
                  activeTab === tab.id
                    ? 'border-[#FF2020] text-white'
                    : 'border-transparent text-white/40 hover:text-white'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="container mx-auto px-4 py-8">
        {tabLoading && (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#FF2020]" />
          </div>
        )}

        {!tabLoading && (
          <>
            {/* ── Resumo ── */}
            {activeTab === 'resumo' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-0 border-t border-l border-[#1a1a1a] sm:grid-cols-3">
                  <InfoCard
                    label="Total de condenações"
                    value={String(politico.total_condenacoes)}
                    color={politico.total_condenacoes > 0 ? '#FF2020' : '#1A6BFF'}
                  />
                  <InfoCard
                    label="Processos ativos"
                    value={String(politico.total_processos)}
                    color="#FFE500"
                  />
                  <InfoCard
                    label="Gastos CEAP (ano)"
                    value={formatCurrency(politico.total_gastos_ceap)}
                    color="#1A6BFF"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-6 w-1 bg-[#FF2020]" />
                    <h3
                      className="text-2xl font-black uppercase tracking-widest text-white"
                      style={{ fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif' }}
                    >
                      Histórico de Mandatos
                    </h3>
                  </div>
                  <div className="space-y-0 border-t border-[#1a1a1a]">
                    {politico.mandatos.map((m, i) => (
                      <div key={i} className="flex items-center gap-4 border-b border-[#1a1a1a] p-4 text-sm hover:bg-[#0a0a0a] transition-colors">
                        <Calendar className="h-4 w-4 flex-shrink-0 text-white/30" />
                        <span className="font-bold text-white">{cargoLabel(m.cargo)}</span>
                        <span className="px-2 py-0.5 bg-[#1a1a1a] text-xs font-black uppercase tracking-widest text-white/60">
                          {m.partido}/{m.siglaUf}
                        </span>
                        <span className="ml-auto text-xs font-black uppercase tracking-widest text-white/40">
                          {m.anoInicio}{m.anoFim ? `–${m.anoFim}` : '–presente'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Condenações ── */}
            {activeTab === 'condenacoes' && (
              <div>
                {condenacoes.length === 0 ? (
                  <EmptyState message="Nenhuma condenação encontrada para este político." />
                ) : (
                  <div className="space-y-3">
                    {condenacoes.map((c) => (
                      <CondenacaoCard key={c.id} condenacao={c} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Gastos ── */}
            {activeTab === 'gastos' && (
              <div className="space-y-10">
                {/* Charts */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                  {gastosMes.length > 0 && (
                    <div>
                      <SectionTitle color="#1A6BFF" title="Gastos por Mês" />
                      <GastoBarChart data={gastosMes} />
                    </div>
                  )}
                  {gastosResumo.length > 0 && (
                    <div>
                      <SectionTitle color="#FFE500" title="Por Categoria" />
                      <div className="hidden sm:block">
                        <GastoPieChart data={gastosResumo} />
                      </div>
                      <div className="sm:hidden text-xs text-white/40 border border-dashed border-[#1a1a1a] p-4 text-center">
                        Gráfico disponível em telas maiores
                      </div>
                    </div>
                  )}
                </div>

                {/* Extrato detalhado */}
                {gastosItens.length > 0 && (
                  <div>
                    <SectionTitle color="#FF2020" title="Extrato de Gastos" />

                    {/* Barra de busca + ordenação */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                        <input
                          type="text"
                          placeholder="Buscar por descrição ou fornecedor..."
                          value={gastosSearch}
                          onChange={(e) => setGastosSearch(e.target.value)}
                          className="w-full bg-[#0a0a0a] border border-[#1a1a1a] pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#FFE500] transition-colors"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setGastosOrdem('valor')}
                          className={cn(
                            'px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors',
                            gastosOrdem === 'valor'
                              ? 'bg-white text-black'
                              : 'border border-[#1a1a1a] text-white/40 hover:text-white'
                          )}
                        >
                          Maior Valor
                        </button>
                        <button
                          onClick={() => setGastosOrdem('data')}
                          className={cn(
                            'px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors',
                            gastosOrdem === 'data'
                              ? 'bg-white text-black'
                              : 'border border-[#1a1a1a] text-white/40 hover:text-white'
                          )}
                        >
                          Mais Recente
                        </button>
                      </div>
                    </div>

                    {/* Lista */}
                    <GastosExtratoList
                      itens={gastosItens}
                      search={gastosSearch}
                      ordem={gastosOrdem}
                    />
                  </div>
                )}

                {gastosResumo.length === 0 && gastosMes.length === 0 && (
                  <EmptyState message="Nenhum dado de gasto disponível." />
                )}
              </div>
            )}

            {/* ── Discursos ── */}
            {activeTab === 'discursos' && (
              <div className="space-y-8">
                {comparacoes.length > 0 && (
                  <div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-6 w-1 bg-[#FFE500]" />
                      <h3
                        className="text-2xl font-black uppercase tracking-widest text-white"
                        style={{ fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif' }}
                      >
                        Promessas vs. Discursos
                      </h3>
                    </div>
                    <DiscursoComparador resultados={comparacoes} />
                  </div>
                )}
                {discursos.length > 0 && (
                  <div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-6 w-1 bg-[#FF2020]" />
                      <h3
                        className="text-2xl font-black uppercase tracking-widest text-white"
                        style={{ fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif' }}
                      >
                        Discursos Recentes
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {discursos.map((d) => (
                        <div
                          key={d.id}
                          className="bg-[#0a0a0a] border border-[#1a1a1a] p-5"
                          style={{ borderLeftColor: '#FFE500', borderLeftWidth: 4 }}
                        >
                          <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-xs font-black uppercase tracking-widest text-white/30">
                              {formatDate(d.dataHoraInicio)}
                              {d.faseEvento && ` · ${d.faseEvento}`}
                            </span>
                            {d.urlTexto && (
                              <a href={d.urlTexto} target="_blank" rel="noopener noreferrer" className="text-[#1A6BFF] hover:text-white flex items-center gap-1 text-xs font-black uppercase tracking-widest transition-colors">
                                Ver íntegra <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          <p className="text-sm font-medium text-white/70 leading-relaxed">{d.sumario}</p>
                          {d.keywords.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {d.keywords.map((k) => (
                                <span key={k} className="px-2 py-0.5 bg-[#1a1a1a] text-xs font-black uppercase tracking-widest text-white/40">
                                  {k}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {discursos.length === 0 && comparacoes.length === 0 && (
                  <EmptyState message="Nenhum discurso disponível para este político." />
                )}
              </div>
            )}
          </>
        )}
      </div>
      {showStoryModal && (
        <ShareStoryModal politico={politico} onClose={() => setShowStoryModal(false)} />
      )}
    </div>
  )
}

function SectionTitle({ color, title }: { color: string; title: string }) {
  return (
    <div className="flex items-center gap-4 mb-4">
      <div className="h-6 w-1" style={{ background: color }} />
      <h3
        className="text-2xl font-black uppercase tracking-widest text-white"
        style={{ fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif' }}
      >
        {title}
      </h3>
    </div>
  )
}

function GastosExtratoList({
  itens,
  search,
  ordem,
}: {
  itens: Gasto[]
  search: string
  ordem: 'valor' | 'data'
}) {
  const [expanded, setExpanded] = useState<number | null>(null)

  const filtered = itens
    .filter((g) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        g.tipoDespesa.toLowerCase().includes(q) ||
        g.nomeFornecedor.toLowerCase().includes(q) ||
        g.numDocumento.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      if (ordem === 'valor') return b.valorLiquido - a.valorLiquido
      // data: ano desc, mes desc
      if (a.ano !== b.ano) return b.ano - a.ano
      return b.mes - a.mes
    })

  if (filtered.length === 0) {
    return (
      <div className="border border-dashed border-[#1a1a1a] p-8 text-center text-sm text-white/30">
        Nenhum gasto encontrado para essa busca.
      </div>
    )
  }

  const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

  return (
    <div className="border-t border-[#1a1a1a]">
      {filtered.map((g) => (
        <div key={g.id} className="border-b border-[#1a1a1a]">
          {/* Row */}
          <button
            onClick={() => setExpanded(expanded === g.id ? null : g.id)}
            className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-[#0a0a0a] transition-colors group"
          >
            {/* Data */}
            <div className="flex-shrink-0 w-12 text-center">
              <p className="text-xs font-black text-white/30 uppercase">{MESES[(g.mes - 1)] ?? g.mes}</p>
              <p className="text-xs font-black text-white/20">{g.ano}</p>
            </div>

            {/* Categoria dot */}
            <div className="flex-shrink-0 h-2 w-2 bg-[#FFE500]" />

            {/* Descrição */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{g.tipoDespesa}</p>
              <p className="text-xs text-white/40 truncate">{g.nomeFornecedor}</p>
            </div>

            {/* Valor */}
            <div className="flex-shrink-0 text-right">
              <p
                className="text-base font-black text-[#FF2020]"
                style={{ fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif' }}
              >
                {formatCurrency(g.valorLiquido)}
              </p>
            </div>

            {/* Chevron */}
            <ChevronDown
              className={cn(
                'flex-shrink-0 h-4 w-4 text-white/20 transition-transform group-hover:text-white/40',
                expanded === g.id && 'rotate-180'
              )}
            />
          </button>

          {/* Expanded detail */}
          {expanded === g.id && (
            <div className="bg-[#0a0a0a] border-t border-[#1a1a1a] px-4 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4"
              style={{ borderLeftColor: '#FFE500', borderLeftWidth: 4 }}
            >
              <DetailField label="Fornecedor" value={g.nomeFornecedor} />
              <DetailField label="CNPJ / CPF" value={g.cnpjCpfFornecedor || '—'} />
              <DetailField label="Nº do Documento" value={g.numDocumento} />
              <DetailField label="Valor do Documento" value={formatCurrency(g.valorDocumento)} />
              <DetailField label="Valor Líquido" value={formatCurrency(g.valorLiquido)} color="#FF2020" />
              <DetailField label="Competência" value={`${MESES[(g.mes - 1)]}/${g.ano}`} />
              {g.urlDocumento && (
                <div className="sm:col-span-3">
                  <a
                    href={g.urlDocumento}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-[#1A6BFF] hover:text-white transition-colors"
                  >
                    Ver nota fiscal / documento <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      <p className="py-3 text-center text-xs font-black uppercase tracking-widest text-white/20">
        {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

function DetailField({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-1">{label}</p>
      <p className="text-sm font-bold" style={{ color: color ?? '#fff' }}>{value}</p>
    </div>
  )
}

function InfoCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="border-b border-r border-[#1a1a1a] p-6 bg-[#0a0a0a]">
      <p className="text-xs font-black uppercase tracking-widest text-white/40 mb-2">{label}</p>
      <p
        className="text-4xl font-black tracking-tighter leading-none"
        style={{
          fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif',
          color,
        }}
      >
        {value}
      </p>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-40 items-center justify-center border border-[#1a1a1a] border-dashed">
      <p className="text-sm font-medium text-white/30">{message}</p>
    </div>
  )
}

function CondenacaoCard({ condenacao: c }: { condenacao: Condenacao }) {
  const statusConfig: Record<string, { label: string; bg: string; textColor: string }> = {
    transitada_julgado: { label: 'TRÂNSITO EM JULGADO', bg: '#FF2020', textColor: '#fff' },
    em_recurso: { label: 'EM RECURSO', bg: '#FFE500', textColor: '#000' },
    extinta: { label: 'EXTINTA', bg: '#1a1a1a', textColor: '#fff' },
    cumprida: { label: 'CUMPRIDA', bg: '#22c55e', textColor: '#000' },
  }
  const status = statusConfig[c.status] ?? { label: c.status.toUpperCase(), bg: '#1a1a1a', textColor: '#fff' }

  return (
    <div
      className="bg-[#0a0a0a] border border-[#1a1a1a] p-5"
      style={{ borderLeftColor: '#FF2020', borderLeftWidth: 4 }}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="text-sm font-bold text-white"
            style={{ fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif' }}
          >
            {c.orgao}
          </span>
          <span className="px-2 py-0.5 bg-[#1a1a1a] text-xs font-black uppercase tracking-widest text-white/60">
            {c.tipo}
          </span>
        </div>
        <span
          className="px-2 py-0.5 text-xs font-black uppercase tracking-widest"
          style={{ background: status.bg, color: status.textColor }}
        >
          {status.label}
        </span>
      </div>
      <p className="text-sm font-medium text-white/70 leading-relaxed mb-3">{c.descricao}</p>
      <div className="flex flex-wrap items-center gap-4 text-xs font-black uppercase tracking-widest text-white/30">
        <span>Decisão: {formatDate(c.dataDecisao)}</span>
        {c.pena && <span>Pena: {c.pena}</span>}
        {c.processo && <span>Processo: {c.processo}</span>}
        {c.urlDecisao && (
          <a href={c.urlDecisao} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#1A6BFF] hover:text-white transition-colors">
            Ver acórdão <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  )
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_CONDENACOES: Condenacao[] = [
  {
    id: 1,
    politicoId: 1,
    orgao: 'TCU',
    tipo: 'administrativa',
    descricao: 'Irregularidades na prestação de contas de convênio firmado com o Ministério da Saúde, com desvio de finalidade de recursos públicos.',
    dataDecisao: '2021-08-15',
    dataTransitoJulgado: '2022-01-10',
    status: 'transitada_julgado',
    pena: 'Multa de R$ 50.000 e inabilitação por 5 anos',
    processo: 'TC 020.123/2020-5',
    urlDecisao: 'https://portal.tcu.gov.br',
  },
  {
    id: 2,
    politicoId: 1,
    orgao: 'TRE-SP',
    tipo: 'eleitoral',
    descricao: 'Abuso de poder econômico em campanha eleitoral de 2018, com uso de recursos não declarados à Justiça Eleitoral.',
    dataDecisao: '2019-03-22',
    status: 'em_recurso',
    processo: 'RESPE 0600123-45.2018.6.26.0000',
  },
]

const MOCK_GASTOS_RESUMO: GastoResumido[] = [
  { tipoDespesa: 'Divulgação da atividade parlamentar', total: 48000, quantidade: 12, percentual: 40 },
  { tipoDespesa: 'Passagens aéreas', total: 24000, quantidade: 48, percentual: 20 },
  { tipoDespesa: 'Hospedagem', total: 18000, quantidade: 36, percentual: 15 },
  { tipoDespesa: 'Combustíveis e lubrificantes', total: 14400, quantidade: 24, percentual: 12 },
  { tipoDespesa: 'Telefonia', total: 9600, quantidade: 12, percentual: 8 },
  { tipoDespesa: 'Serviços postais', total: 6000, quantidade: 24, percentual: 5 },
]

const MOCK_GASTOS_MES: GastosPorMes[] = [
  { ano: 2024, mes: 1, total: 8500 },
  { ano: 2024, mes: 2, total: 11200 },
  { ano: 2024, mes: 3, total: 9800 },
  { ano: 2024, mes: 4, total: 13400 },
  { ano: 2024, mes: 5, total: 10100 },
  { ano: 2024, mes: 6, total: 15600 },
  { ano: 2024, mes: 7, total: 12300 },
  { ano: 2024, mes: 8, total: 11900 },
  { ano: 2024, mes: 9, total: 14200 },
  { ano: 2024, mes: 10, total: 9600 },
  { ano: 2024, mes: 11, total: 8900 },
  { ano: 2024, mes: 12, total: 14500 },
]

const MOCK_DISCURSOS: Discurso[] = [
  {
    id: 1,
    politicoId: 1,
    dataHoraInicio: '2024-06-10T14:30:00',
    sumario: 'O deputado discutiu a necessidade de aumentar o orçamento para a educação pública, defendendo a destinação de 30% das receitas de royalties do petróleo para o setor.',
    keywords: ['educação', 'royalties', 'orçamento', 'escola pública'],
    faseEvento: 'Pequeno Expediente',
    tipoDiscurso: 'DISCURSO',
    urlTexto: 'https://dadosabertos.camara.leg.br',
  },
  {
    id: 2,
    politicoId: 1,
    dataHoraInicio: '2024-05-22T10:00:00',
    sumario: 'Em plenário, o parlamentar votou contra o projeto de privatização da Petrobras, argumentando que a empresa é estratégica para a soberania nacional e para o desenvolvimento tecnológico do Brasil.',
    keywords: ['petrobras', 'privatização', 'soberania', 'energia'],
    faseEvento: 'Ordem do Dia',
    tipoDiscurso: 'DISCURSO',
  },
  {
    id: 3,
    politicoId: 1,
    dataHoraInicio: '2024-04-15T16:45:00',
    sumario: 'O deputado apresentou emenda ao orçamento para reduzir gastos com saúde pública em R$ 200 milhões, redirecionando os recursos para obras de infraestrutura no seu estado.',
    keywords: ['saúde', 'orçamento', 'emenda', 'infraestrutura'],
    faseEvento: 'Comissão de Orçamento',
    tipoDiscurso: 'DISCURSO',
  },
]

const MOCK_PROMESSAS = [
  {
    id: 1,
    politicoId: 1,
    descricao: 'Vou lutar para que 30% dos royalties do petróleo sejam destinados à educação pública brasileira.',
    fonte: 'debate',
    dataPromessa: '2022-09-15',
    tema: 'educação',
    cumprida: null,
  },
  {
    id: 2,
    politicoId: 1,
    descricao: 'Defenderemos ampliar o investimento em saúde pública e nunca votarei por cortes no SUS.',
    fonte: 'programa_de_governo',
    dataPromessa: '2022-08-01',
    tema: 'saúde',
    cumprida: null,
  },
]

const MOCK_GASTOS_ITENS: Gasto[] = [
  { id: 1, politicoId: 1, ano: 2024, mes: 6, tipoDespesa: 'Divulgação da atividade parlamentar', cnpjCpfFornecedor: '12.345.678/0001-99', nomeFornecedor: 'Gráfica Comunicação Total Ltda', numDocumento: 'NF-002341', valorDocumento: 18500, valorLiquido: 18500, urlDocumento: 'https://dadosabertos.camara.leg.br' },
  { id: 2, politicoId: 1, ano: 2024, mes: 5, tipoDespesa: 'Passagens aéreas', cnpjCpfFornecedor: '07.575.651/0001-59', nomeFornecedor: 'LATAM Airlines Brasil S.A.', numDocumento: 'ETK-9982341', valorDocumento: 4200, valorLiquido: 4200 },
  { id: 3, politicoId: 1, ano: 2024, mes: 5, tipoDespesa: 'Hospedagem', cnpjCpfFornecedor: '45.981.060/0001-03', nomeFornecedor: 'Hotel Nacional Brasília', numDocumento: 'REC-00521', valorDocumento: 3800, valorLiquido: 3800 },
  { id: 4, politicoId: 1, ano: 2024, mes: 4, tipoDespesa: 'Combustíveis e lubrificantes', cnpjCpfFornecedor: '89.237.654/0001-12', nomeFornecedor: 'Posto Alvorada Combustíveis', numDocumento: 'CUP-4412', valorDocumento: 1250, valorLiquido: 1250 },
  { id: 5, politicoId: 1, ano: 2024, mes: 4, tipoDespesa: 'Divulgação da atividade parlamentar', cnpjCpfFornecedor: '98.321.456/0001-77', nomeFornecedor: 'Agência Digital Planalto ME', numDocumento: 'NF-001188', valorDocumento: 12000, valorLiquido: 12000, urlDocumento: 'https://dadosabertos.camara.leg.br' },
  { id: 6, politicoId: 1, ano: 2024, mes: 3, tipoDespesa: 'Telefonia', cnpjCpfFornecedor: '02.558.157/0001-62', nomeFornecedor: 'Claro S.A.', numDocumento: 'FAT-2024031', valorDocumento: 890, valorLiquido: 890 },
  { id: 7, politicoId: 1, ano: 2024, mes: 3, tipoDespesa: 'Alimentação', cnpjCpfFornecedor: '31.456.789/0001-44', nomeFornecedor: 'Restaurante Executivo Central', numDocumento: 'NF-00887', valorDocumento: 2100, valorLiquido: 2100 },
  { id: 8, politicoId: 1, ano: 2024, mes: 2, tipoDespesa: 'Passagens aéreas', cnpjCpfFornecedor: '07.575.651/0001-59', nomeFornecedor: 'LATAM Airlines Brasil S.A.', numDocumento: 'ETK-8871234', valorDocumento: 5600, valorLiquido: 5600 },
  { id: 9, politicoId: 1, ano: 2024, mes: 2, tipoDespesa: 'Serviços postais', cnpjCpfFornecedor: '34.028.316/0001-03', nomeFornecedor: 'Empresa Brasileira de Correios e Telégrafos', numDocumento: 'REC-220241', valorDocumento: 430, valorLiquido: 430 },
  { id: 10, politicoId: 1, ano: 2024, mes: 1, tipoDespesa: 'Locação de veículos', cnpjCpfFornecedor: '05.423.963/0001-11', nomeFornecedor: 'Localiza Rent a Car S.A.', numDocumento: 'NF-041122', valorDocumento: 3200, valorLiquido: 3200 },
  { id: 11, politicoId: 1, ano: 2024, mes: 1, tipoDespesa: 'Divulgação da atividade parlamentar', cnpjCpfFornecedor: '12.345.678/0001-99', nomeFornecedor: 'Gráfica Comunicação Total Ltda', numDocumento: 'NF-001998', valorDocumento: 9800, valorLiquido: 9800 },
  { id: 12, politicoId: 1, ano: 2023, mes: 12, tipoDespesa: 'Hospedagem', cnpjCpfFornecedor: '78.234.123/0001-55', nomeFornecedor: 'Bristol Brasil Hotéis', numDocumento: 'REC-00341', valorDocumento: 2900, valorLiquido: 2900 },
]

const MOCK_COMPARACOES: ComparacaoResult[] = [
  {
    promessa: MOCK_PROMESSAS[0] as any,
    discursos_relacionados: [
      {
        discurso: MOCK_DISCURSOS[0],
        similaridade: 0.89,
        tipo: 'confirmacao',
        trecho_destacado: 'necessidade de aumentar o orçamento para a educação pública, defendendo a destinação de 30% das receitas de royalties do petróleo para o setor',
      },
    ],
    score_geral: 0.89,
    veredicto: 'cumprida',
  },
  {
    promessa: MOCK_PROMESSAS[1] as any,
    discursos_relacionados: [
      {
        discurso: MOCK_DISCURSOS[2],
        similaridade: 0.18,
        tipo: 'contradicao',
        trecho_destacado: 'emenda ao orçamento para reduzir gastos com saúde pública em R$ 200 milhões',
      },
    ],
    score_geral: 0.18,
    veredicto: 'contradita',
  },
]
