'use client'

import { useEffect, useState } from 'react'
import { X, ChevronLeft, ChevronRight, Share2, Download } from 'lucide-react'
import type { Politico } from '@/lib/types'
import { cargoLabel, formatCurrency } from '@/lib/utils'

interface ShareStoryModalProps {
  politico: Politico
  onClose: () => void
}

function getScoreColor(score: number): string {
  if (score >= 70) return '#1A6BFF'
  if (score >= 40) return '#FFE500'
  return '#FF2020'
}

function getScoreLabel(score: number): string {
  if (score >= 70) return 'ALTA INTEGRIDADE'
  if (score >= 40) return 'MÉDIA INTEGRIDADE'
  return 'BAIXA INTEGRIDADE'
}

function getStatusBadge(politico: Politico): { text: string; bg: string; textColor: string } {
  if (politico.score_disponivel === false) return { text: 'PRÉ-CANDIDATO 2026', bg: '#1a1a1a', textColor: '#fff' }
  if (politico.total_condenacoes > 0) return { text: 'CONDENADO', bg: '#FF2020', textColor: '#fff' }
  if (politico.score_transparencia >= 70) return { text: 'FICHA LIMPA', bg: '#1A6BFF', textColor: '#fff' }
  return { text: 'INVESTIGADO', bg: '#FFE500', textColor: '#000' }
}

function downloadCanvas(canvas: HTMLCanvasElement, nome: string, slide: number) {
  const link = document.createElement('a')
  link.download = `sempalanque-${nome.replace(/\s+/g, '-').toLowerCase()}-slide${slide + 1}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

// Dots indicator
function SlideDots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: i === current ? '#fff' : 'rgba(255,255,255,0.25)',
          }}
        />
      ))}
    </div>
  )
}

// Brand top-left
function Brand() {
  return (
    <div style={{ padding: '20px 24px 0' }}>
      <span style={{
        fontSize: 10,
        fontWeight: 900,
        color: '#fff',
        letterSpacing: '0.22em',
        textTransform: 'uppercase' as const,
        fontFamily: "'Space Grotesk', sans-serif",
      }}>
        SEM PALANQUE
      </span>
      <SlideDots current={-1} total={4} />
    </div>
  )
}

// Bottom bar
function BottomBar({ bg, textColor = '#fff' }: { bg: string; textColor?: string }) {
  return (
    <div style={{ background: bg, padding: '16px 24px', flexShrink: 0 }}>
      <div style={{ color: textColor, fontSize: 13, fontWeight: 900, letterSpacing: '0.07em', fontFamily: "'Space Grotesk', sans-serif" }}>
        SEM PALANQUE
      </div>
      <div style={{ color: textColor === '#fff' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)', fontSize: 9, marginTop: 2, fontFamily: "'Space Grotesk', sans-serif" }}>
        Os candidatos como eles são.
      </div>
    </div>
  )
}

// Slide 1 — Identidade
function Slide1({ politico, badge }: { politico: Politico; badge: ReturnType<typeof getStatusBadge> }) {
  const initial = politico.nome.charAt(0)
  return (
    <div style={{ width: 390, height: 693, background: '#000', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Space Grotesk', sans-serif", position: 'relative' }}>
      {/* Brand */}
      <div style={{ padding: '20px 24px 0' }}>
        <span style={{ fontSize: 10, fontWeight: 900, color: '#fff', letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: "'Space Grotesk', sans-serif" }}>
          SEM PALANQUE
        </span>
        <SlideDots current={0} total={4} />
      </div>

      {/* Photo */}
      <div style={{ position: 'absolute', top: 76, left: 24 }}>
        {politico.urlFoto ? (
          <img
            src={politico.urlFoto}
            alt={politico.nome}
            style={{ width: 210, height: 210, objectFit: 'cover', objectPosition: 'top', filter: 'grayscale(100%) contrast(1.1)', display: 'block' }}
          />
        ) : (
          <div style={{ width: 210, height: 210, background: `linear-gradient(135deg, ${badge.bg}88, ${badge.bg}44)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 80, fontWeight: 900, color: badge.textColor === '#fff' ? '#fff' : '#000', fontFamily: "'Space Grotesk', sans-serif" }}>{initial}</span>
          </div>
        )}
        {/* Subtle line below photo */}
        <div style={{ width: 210, height: 1, background: 'rgba(255,255,255,0.08)', marginTop: 0 }} />
      </div>

      {/* Content below photo */}
      <div style={{ position: 'absolute', top: 310, left: 24, right: 24 }}>
        {/* Badge */}
        <div style={{ marginBottom: 12 }}>
          <span style={{ display: 'inline-block', background: badge.bg, color: badge.textColor, fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '4px 10px', fontFamily: "'Space Grotesk', sans-serif" }}>
            {badge.text}
          </span>
        </div>
        {/* Name */}
        <div style={{ fontSize: 74, fontWeight: 900, color: '#fff', lineHeight: 0.88, textTransform: 'uppercase', fontFamily: "'Space Grotesk', sans-serif", wordBreak: 'break-word' }}>
          {politico.nome}
        </div>
        {/* Meta */}
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 10, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>
          {politico.partido} · {politico.siglaUf} · {cargoLabel(politico.cargo)}
        </div>
      </div>

      {/* Bottom */}
      <div style={{ marginTop: 'auto' }}>
        <BottomBar bg="#FF2020" />
      </div>
    </div>
  )
}

// Slide 2 — Score de Integridade
function Slide2({ politico }: { politico: Politico }) {
  const score = politico.score_transparencia
  const hasScore = politico.score_disponivel !== false
  const scoreColor = hasScore ? getScoreColor(score) : '#ffffff40'
  const scoreLabel = hasScore ? getScoreLabel(score) : 'DADOS EM CONSOLIDAÇÃO'

  return (
    <div style={{ width: 390, height: 693, background: '#0a0a0a', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Space Grotesk', sans-serif" }}>
      {/* Brand */}
      <div style={{ padding: '20px 24px 0' }}>
        <span style={{ fontSize: 10, fontWeight: 900, color: '#fff', letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: "'Space Grotesk', sans-serif" }}>
          SEM PALANQUE
        </span>
        <SlideDots current={1} total={4} />
      </div>

      {/* Score section */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 24px 0', overflow: 'hidden' }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: '#FF2020', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: "'Space Grotesk', sans-serif" }}>
            SCORE DE INTEGRIDADE
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 96, fontWeight: 900, lineHeight: 1, color: '#FF2020', fontFamily: "'Space Grotesk', sans-serif" }}>{hasScore ? score : '—'}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: "'Space Grotesk', sans-serif", marginTop: 2 }}>DE 100</div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, background: '#1a1a1a', margin: '14px 0 8px' }}>
          <div style={{ height: '100%', width: `${hasScore ? score : 0}%`, background: scoreColor }} />
        </div>
        <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 900, color: scoreColor, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: "'Space Grotesk', sans-serif" }}>
          {scoreLabel}
        </div>

        {/* Condenações count */}
        {politico.total_condenacoes > 0 && (
          <div style={{ marginTop: 20, fontSize: 16, fontWeight: 900, color: '#FF2020', textTransform: 'uppercase', fontFamily: "'Space Grotesk', sans-serif" }}>
            {politico.total_condenacoes} {politico.total_condenacoes === 1 ? 'CONDENAÇÃO' : 'CONDENAÇÕES'}
          </div>
        )}

        {politico.total_condenacoes > 0 ? (
          <div style={{ marginTop: 12, borderLeft: '3px solid #FF2020', paddingLeft: 10 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.4 }}>
              Condenações encontradas em bases oficiais integradas. Detalhes completos no perfil.
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 20, border: '1px dashed rgba(255,255,255,0.12)', padding: 14 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
              Nenhuma condenação integrada neste protótipo. O Sem Palanque não usa condenações de exemplo.
            </div>
          </div>
        )}
      </div>

      <BottomBar bg="#FF2020" />
    </div>
  )
}

// Slide 3 — Gastos
function Slide3({ politico }: { politico: Politico }) {
  const total = politico.total_gastos_ceap
  const totalFormatted = total >= 1000 ? `R$ ${(total / 1000).toFixed(0)}k` : formatCurrency(total)
  const hasGastos = total > 0

  return (
    <div style={{ width: 390, height: 693, background: '#000', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Space Grotesk', sans-serif" }}>
      {/* Brand */}
      <div style={{ padding: '20px 24px 0' }}>
        <span style={{ fontSize: 10, fontWeight: 900, color: '#fff', letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: "'Space Grotesk', sans-serif" }}>
          SEM PALANQUE
        </span>
        <SlideDots current={2} total={4} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 24px 0', overflow: 'hidden' }}>
        {/* Label */}
        <div style={{ fontSize: 10, fontWeight: 900, color: '#1A6BFF', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: "'Space Grotesk', sans-serif", marginBottom: 8 }}>
          GASTOS COM VERBA PÚBLICA EM 2024
        </div>

        {/* Total */}
        <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1, color: '#1A6BFF', fontFamily: "'Space Grotesk', sans-serif" }}>
          {hasGastos ? totalFormatted : '—'}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: "'Space Grotesk', sans-serif", marginTop: 4 }}>
          VERBA PÚBLICA
        </div>

        {hasGastos ? (
          <div style={{ marginTop: 24, border: '1px solid rgba(26,107,255,0.25)', padding: 14 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
              Detalhamento por mês e categoria disponível no perfil.
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 24, border: '1px dashed rgba(255,255,255,0.12)', padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#1A6BFF', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
              Base pendente
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
              {politico.fonte_gastos ? `Fonte prevista: ${politico.fonte_gastos}.` : 'Gastos ainda não consolidados nas bases integradas.'}
            </div>
          </div>
        )}
      </div>

      <BottomBar bg="#1A6BFF" />
    </div>
  )
}

// Slide 4 — Promessas vs Discursos
function Slide4({ politico }: { politico: Politico }) {
  const cumpridas: number = 0
  const contraditas: number = 0

  return (
    <div style={{ width: 390, height: 693, background: '#0a0a0a', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Space Grotesk', sans-serif" }}>
      {/* Brand */}
      <div style={{ padding: '20px 24px 0' }}>
        <span style={{ fontSize: 10, fontWeight: 900, color: '#fff', letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: "'Space Grotesk', sans-serif" }}>
          SEM PALANQUE
        </span>
        <SlideDots current={3} total={4} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 24px 0', overflow: 'hidden' }}>
        {/* Label */}
        <div style={{ fontSize: 10, fontWeight: 900, color: '#FFE500', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.5 }}>
          COERÊNCIA ENTRE PROMESSAS E<br />DISCURSOS
        </div>

        {/* Percentage */}
        <div style={{ fontSize: 96, fontWeight: 900, lineHeight: 1, color: '#FFE500', fontFamily: "'Space Grotesk', sans-serif", marginTop: 12 }}>
          —
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: "'Space Grotesk', sans-serif", marginTop: 2 }}>
          DE COERÊNCIA
        </div>

        {/* Stats boxes */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <div style={{ flex: 1, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', padding: '10px 12px' }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#22c55e', fontFamily: "'Space Grotesk', sans-serif" }}>{cumpridas}</div>
            <div style={{ fontSize: 9, fontWeight: 900, color: '#22c55e', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: "'Space Grotesk', sans-serif" }}>CUMPRIDA{cumpridas !== 1 ? 'S' : ''}</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(255,32,32,0.12)', border: '1px solid rgba(255,32,32,0.3)', padding: '10px 12px' }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#FF2020', fontFamily: "'Space Grotesk', sans-serif" }}>{contraditas}</div>
            <div style={{ fontSize: 9, fontWeight: 900, color: '#FF2020', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: "'Space Grotesk', sans-serif" }}>CONTRADITA{contraditas !== 1 ? 'S' : ''}</div>
          </div>
        </div>

        <div style={{ marginTop: 20, border: '1px dashed rgba(255,255,255,0.12)', padding: 14 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
            Comparação automática pendente. O card final só exibe promessas e discursos quando houver transcrição ou fonte oficial conectada.
          </div>
        </div>
      </div>

      <BottomBar bg="#FFE500" textColor="#000" />
    </div>
  )
}

const SLIDE_LABELS = ['Identidade', 'Integridade', 'Gastos', 'Promessas']

export default function ShareStoryModal({ politico, onClose }: ShareStoryModalProps) {
  const [loading, setLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    setIsMobile(/iPhone|iPad|Android/i.test(navigator.userAgent))
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setCurrentSlide(s => Math.max(0, s - 1))
      if (e.key === 'ArrowRight') setCurrentSlide(s => Math.min(3, s + 1))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const badge = getStatusBadge(politico)

  const slides = [
    <Slide1 key={0} politico={politico} badge={badge} />,
    <Slide2 key={1} politico={politico} />,
    <Slide3 key={2} politico={politico} />,
    <Slide4 key={3} politico={politico} />,
  ]

  async function handleShare() {
    if (loading) return
    setLoading(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const el = document.getElementById('story-card-render')!
      const canvas = await html2canvas(el, {
        scale: 3,
        useCORS: true,
        backgroundColor: currentSlide === 0 || currentSlide === 2 ? '#000000' : '#0a0a0a',
        logging: false,
      })

      if (navigator.canShare && navigator.share) {
        canvas.toBlob(async (blob) => {
          if (!blob) { downloadCanvas(canvas, politico.nome, currentSlide); return }
          const file = new File([blob], `sempalanque-slide${currentSlide + 1}.png`, { type: 'image/png' })
          if (navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({ files: [file], title: 'Sem Palanque' })
            } catch {
              downloadCanvas(canvas, politico.nome, currentSlide)
            }
          } else {
            downloadCanvas(canvas, politico.nome, currentSlide)
          }
        }, 'image/png')
      } else {
        downloadCanvas(canvas, politico.nome, currentSlide)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative flex flex-col items-center gap-4 w-full max-w-sm">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-10 flex h-8 w-8 items-center justify-center bg-[#1a1a1a] text-white/60 hover:text-white transition-colors"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Slide label */}
        <div className="text-xs font-black uppercase tracking-widest text-white/40">
          {SLIDE_LABELS[currentSlide]} · {currentSlide + 1}/4
        </div>

        {/* Card preview + navigation */}
        <div className="relative flex items-center gap-3 w-full justify-center">
          {/* Prev */}
          <button
            onClick={() => setCurrentSlide(s => Math.max(0, s - 1))}
            disabled={currentSlide === 0}
            className="flex-shrink-0 flex h-8 w-8 items-center justify-center bg-[#1a1a1a] text-white/60 hover:text-white transition-colors disabled:opacity-20"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Card wrapper — scales down to fit screen */}
          <div
            style={{
              width: 390,
              maxWidth: 'calc(100vw - 120px)',
              transformOrigin: 'top center',
            }}
            className="scale-[0.72] sm:scale-90 origin-top"
          >
            {/* Off-screen render target for html2canvas */}
            <div
              id="story-card-render"
              style={{ position: 'absolute', left: -9999, top: -9999, width: 390, height: 693 }}
            >
              {slides[currentSlide]}
            </div>

            {/* Visible preview */}
            <div style={{ width: 390, height: 693, overflow: 'hidden' }}>
              {slides[currentSlide]}
            </div>
          </div>

          {/* Next */}
          <button
            onClick={() => setCurrentSlide(s => Math.min(3, s + 1))}
            disabled={currentSlide === 3}
            className="flex-shrink-0 flex h-8 w-8 items-center justify-center bg-[#1a1a1a] text-white/60 hover:text-white transition-colors disabled:opacity-20"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Dots */}
        <div className="flex gap-2">
          {[0, 1, 2, 3].map(i => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-2 w-2 rounded-full transition-colors ${i === currentSlide ? 'bg-white' : 'bg-white/20 hover:bg-white/40'}`}
            />
          ))}
        </div>

        {/* Action */}
        <div className="flex flex-col items-center gap-2 w-full max-w-[390px]">
          <button
            onClick={handleShare}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 border-2 border-white bg-black px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50"
          >
            {loading ? (
              <>Gerando...</>
            ) : (
              <>
                {isMobile ? <Share2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                {isMobile ? 'Compartilhar Slide' : 'Baixar Slide'}
              </>
            )}
          </button>
          <p className="text-center text-xs font-medium text-white/40">
            Navegue entre os 4 slides e compartilhe
          </p>
        </div>
      </div>
    </div>
  )
}
