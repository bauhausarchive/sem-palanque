'use client'

import { useState, useRef, useEffect } from 'react'
import { Loader2, Zap, Youtube, X, LinkIcon, ChevronDown } from 'lucide-react'
import DiscursoComparador from '@/components/DiscursoComparador'
import { compararDiscursos } from '@/lib/api'
import type { PoliticoSearchResult, ComparacaoResult } from '@/lib/types'
import { cn } from '@/lib/utils'
import { featuredStaticPoliticos, searchStaticPoliticos } from '@/lib/static-politicos'

async function analisarPolitico(politicoId: number, youtubeLinks: string[]): Promise<ComparacaoResult[]> {
  return compararDiscursos({ politico_id: politicoId, promessas: [], youtube_links: youtubeLinks })
}

const FONTES_MONITORADAS = ['G1', 'Folha de S.Paulo', 'UOL', 'O Globo', 'Agência Brasil', 'Estadão', 'R7', 'CNN Brasil', 'BBC Brasil']

function getStatusBadge(p: PoliticoSearchResult) {
  if (p.score_disponivel === false) return { text: 'PRÉ-CANDIDATO', bg: '#1a1a1a', color: '#fff' }
  if (p.total_condenacoes > 0) return { text: 'CONDENADO', bg: '#FF2020', color: '#fff' }
  if (p.score_transparencia >= 70) return { text: 'FICHA LIMPA', bg: '#1A6BFF', color: '#fff' }
  return { text: 'INVESTIGADO', bg: '#FFE500', color: '#000' }
}

function PoliticoDropdown({ onSelect }: { onSelect: (p: PoliticoSearchResult | null) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<PoliticoSearchResult | null>(null)
  const [options, setOptions] = useState<PoliticoSearchResult[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    featuredStaticPoliticos(40).then(setOptions)
  }, [])

  useEffect(() => {
    if (!open) return
    if (!query.trim()) {
      featuredStaticPoliticos(40).then(setOptions)
      return
    }
    searchStaticPoliticos(query, 40).then(setOptions)
  }, [query, open])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(p: PoliticoSearchResult) {
    setSelected(p)
    setOpen(false)
    setQuery('')
    onSelect(p)
  }

  function handleClear() {
    setSelected(null)
    setQuery('')
    onSelect(null)
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      {selected ? (
        <div className="flex items-center gap-3 border-2 border-[#FFE500] bg-black px-4 py-3">
          <span className="font-bold text-white text-sm flex-1" style={{ fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif' }}>
            {selected.nome}
          </span>
          <span className="px-2 py-0.5 bg-[#1a1a1a] text-xs font-black uppercase tracking-widest text-white/50">
            {selected.partido}/{selected.siglaUf}
          </span>
          <button onClick={handleClear} className="text-white/40 hover:text-[#FF2020] transition-colors ml-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between border-2 border-[#1a1a1a] bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white/40 hover:border-white/30 transition-colors"
        >
          <span>Selecione um político…</span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </button>
      )}

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#0a0a0a] border border-[#1a1a1a] shadow-2xl shadow-black">
          {/* Search inside dropdown */}
          <div className="border-b border-[#1a1a1a] px-3 py-2">
            <input
              autoFocus
              type="text"
              placeholder="Filtrar por nome, partido ou estado…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-white placeholder-white/30 outline-none"
            />
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto">
            {options.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-white/30">Nenhum político encontrado.</p>
            )}
            {options.map((p) => {
              const badge = getStatusBadge(p)
              const scoreColor = p.score_disponivel === false ? '#ffffff40' : p.score_transparencia >= 70 ? '#1A6BFF' : p.score_transparencia >= 40 ? '#FFE500' : '#FF2020'
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#1a1a1a] transition-colors border-b border-[#1a1a1a] last:border-0"
                >
                  {/* Score */}
                  <div
                    className="flex-shrink-0 w-10 text-center text-xl font-black leading-none"
                    style={{ fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif', color: scoreColor }}
                  >
                    {p.score_disponivel === false ? '—' : p.score_transparencia}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{p.nome}</p>
                    <p className="text-xs text-white/40 uppercase tracking-widest">{p.partido} · {p.siglaUf}</p>
                  </div>
                  {/* Badge */}
                  <span
                    className="flex-shrink-0 px-2 py-0.5 text-xs font-black uppercase tracking-widest"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    {badge.text}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ComparadorPage() {
  const [selectedPolitico, setSelectedPolitico] = useState<PoliticoSearchResult | null>(null)
  const [youtubeLinks, setYoutubeLinks] = useState<string[]>([])
  const [youtubeInput, setYoutubeInput] = useState('')
  const [youtubeError, setYoutubeError] = useState('')
  const [resultados, setResultados] = useState<ComparacaoResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')
  const [error, setError] = useState<string | null>(null)

  function addYoutubeLink() {
    const url = youtubeInput.trim()
    if (!url) return
    if (!/youtube\.com|youtu\.be/.test(url)) {
      setYoutubeError('Cole um link válido do YouTube (youtube.com ou youtu.be)')
      return
    }
    if (youtubeLinks.includes(url)) {
      setYoutubeError('Esse link já foi adicionado.')
      return
    }
    setYoutubeLinks((prev) => [...prev, url])
    setYoutubeInput('')
    setYoutubeError('')
  }

  async function handleAnalisar() {
    if (!selectedPolitico) return
    setLoading(true)
    setError(null)
    setResultados(null)
    try {
      setLoadingStep('Buscando declarações em portais de notícias…')
      await new Promise((r) => setTimeout(r, 1200))
      if (youtubeLinks.length > 0) {
        setLoadingStep('Transcrevendo vídeos do YouTube…')
        await new Promise((r) => setTimeout(r, 1000))
      }
      setLoadingStep('Cruzando com discursos parlamentares…')
      await new Promise((r) => setTimeout(r, 900))
      setLoadingStep('Calculando coerência com IA…')
      const res = await analisarPolitico(selectedPolitico.id, youtubeLinks).catch(() => [])
      setResultados(res)
    } catch {
      setError('Erro ao analisar. Verifique se o servidor está disponível.')
    } finally {
      setLoading(false)
      setLoadingStep('')
    }
  }

  const canSubmit = selectedPolitico !== null && !loading
  const cumpridas = resultados?.filter((r) => r.veredicto === 'cumprida').length ?? 0
  const contraditas = resultados?.filter((r) => r.veredicto === 'contradita').length ?? 0
  const semEvidencia = resultados?.filter((r) => r.veredicto === 'sem_evidencia').length ?? 0

  return (
    <div className="bg-black min-h-screen">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] bg-[#0a0a0a] py-12">
        <div className="container mx-auto px-4">
          <div className="mb-3 inline-flex items-center gap-2 bg-[#1A6BFF] px-3 py-1">
            <Zap className="h-3 w-3 text-white" />
            <span className="text-xs font-black uppercase tracking-widest text-white">Análise por IA</span>
          </div>
          <h1
            className="text-4xl font-black uppercase tracking-tighter text-white sm:text-5xl md:text-6xl lg:text-7xl"
            style={{ fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif', lineHeight: 0.95 }}
          >
            DISCURSO<br />
            <span className="text-[#FF2020]">VS</span> REALIDADE
          </h1>
          <p className="mt-4 max-w-2xl text-sm font-medium text-white/50">
            Selecione o político. A IA busca automaticamente declarações em portais de notícias e cruza com os discursos parlamentares registrados.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">

          {/* Left: inputs */}
          <div className="space-y-8">

            {/* Step 1 — Dropdown */}
            <div>
              <StepLabel number={1} label="Selecionar político" />
              <PoliticoDropdown onSelect={(p) => { setSelectedPolitico(p); setResultados(null) }} />
            </div>

            {/* Step 2 — YouTube opcional */}
            <div>
              <StepLabel number={2} label="Vídeos do YouTube (opcional)" />
              <p className="text-xs font-medium text-white/30 mb-3">
                Cole links de entrevistas ou discursos em vídeo para incluir na análise.
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                  <input
                    type="url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={youtubeInput}
                    onChange={(e) => { setYoutubeInput(e.target.value); setYoutubeError('') }}
                    onKeyDown={(e) => e.key === 'Enter' && addYoutubeLink()}
                    className="w-full bg-[#0a0a0a] border border-[#1a1a1a] pl-10 pr-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-[#FF2020] transition-colors"
                  />
                </div>
                <button
                  onClick={addYoutubeLink}
                  className="flex-shrink-0 border border-[#1a1a1a] bg-[#0a0a0a] px-4 text-white/40 hover:border-white hover:text-white transition-colors"
                >
                  <LinkIcon className="h-4 w-4" />
                </button>
              </div>
              {youtubeError && <p className="mt-2 text-xs font-medium text-[#FF2020]">{youtubeError}</p>}
              {youtubeLinks.length > 0 && (
                <div className="mt-3 space-y-2">
                  {youtubeLinks.map((url) => (
                    <div key={url} className="flex items-center gap-3 bg-[#0a0a0a] border border-[#1a1a1a] px-3 py-2">
                      <Youtube className="h-3.5 w-3.5 flex-shrink-0 text-[#FF2020]" />
                      <span className="flex-1 text-xs text-white/50 truncate">{url}</span>
                      <button onClick={() => setYoutubeLinks((p) => p.filter((l) => l !== url))} className="text-white/20 hover:text-[#FF2020] transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              onClick={handleAnalisar}
              disabled={!canSubmit}
              className={cn(
                'flex w-full items-center justify-center gap-2 py-4 text-sm font-black uppercase tracking-widest transition-colors',
                canSubmit ? 'bg-[#FF2020] text-white hover:bg-white hover:text-black' : 'bg-[#1a1a1a] text-white/20 cursor-not-allowed'
              )}
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" />{loadingStep || 'Analisando…'}</>
              ) : (
                <><Zap className="h-4 w-4" />Analisar com IA</>
              )}
            </button>

            {/* Fontes monitoradas — abaixo do botão */}
            <div className="border border-[#1a1a1a]">
              <div className="px-4 py-2 border-b border-[#1a1a1a] flex items-center gap-2">
                <div className="h-1.5 w-1.5 bg-[#22c55e]" />
                <span className="text-xs font-black uppercase tracking-widest text-white/30">Monitorando</span>
              </div>
              <div className="flex flex-wrap gap-2 px-4 py-3">
                {FONTES_MONITORADAS.map((f) => (
                  <span key={f} className="px-2 py-0.5 border border-[#1a1a1a] text-xs font-black uppercase tracking-widest text-white/40">
                    {f}
                  </span>
                ))}
              </div>
            </div>

            {error && (
              <div className="border-l-4 border-[#FF2020] bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-[#FF2020]">
                {error}
              </div>
            )}
          </div>

          {/* Right: results */}
          <div>
            {resultados === null && !loading && (
              <div className="flex h-72 flex-col items-center justify-center border border-dashed border-[#1a1a1a] gap-4 text-center px-8">
                <Zap className="h-10 w-10 text-white/10" />
                <p className="text-xs font-black uppercase tracking-widest text-white/30">
                  Os resultados aparecerão aqui
                </p>
              </div>
            )}

            {loading && (
              <div className="flex h-72 flex-col items-center justify-center gap-4 border border-[#1a1a1a] px-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#FF2020]" />
                <p className="text-xs font-black uppercase tracking-widest text-white/40 text-center">{loadingStep}</p>
              </div>
            )}

            {resultados && resultados.length > 0 && (
              <div>
                <div className="mb-6 grid grid-cols-3 border-t border-l border-[#1a1a1a]">
                  <SummaryCard value={cumpridas} label="Coerentes" color="#22c55e" />
                  <SummaryCard value={contraditas} label="Contraditas" color="#FF2020" />
                  <SummaryCard value={semEvidencia} label="Sem evidência" color="rgba(255,255,255,0.2)" />
                </div>
                <div className="mb-6 flex items-center gap-3">
                  <div className="h-1 flex-1 bg-[#1a1a1a]">
                    <div className="h-full bg-[#22c55e]" style={{ width: `${(cumpridas / resultados.length) * 100}%` }} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-white/40">{selectedPolitico?.nome}</span>
                </div>
                <DiscursoComparador resultados={resultados} />
              </div>
            )}

            {resultados && resultados.length === 0 && (
              <div className="flex h-40 items-center justify-center border border-dashed border-[#1a1a1a]">
                <p className="px-6 text-center text-sm font-medium text-white/30">
                  Nenhuma declaração consolidada. O protótipo não exibe exemplos fictícios de promessas ou discursos.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StepLabel({ number, label }: { number: number; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div
        className="flex h-7 w-7 items-center justify-center bg-[#FF2020] text-white text-sm font-black flex-shrink-0"
        style={{ fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif' }}
      >
        {number}
      </div>
      <span className="text-xs font-black uppercase tracking-widest text-white">{label}</span>
    </div>
  )
}

function SummaryCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="border-b border-r border-[#1a1a1a] p-4">
      <div className="text-4xl font-black leading-none tracking-tighter" style={{ fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif', color }}>
        {value}
      </div>
      <div className="text-xs font-black uppercase tracking-widest text-white/30 mt-1">{label}</div>
    </div>
  )
}
