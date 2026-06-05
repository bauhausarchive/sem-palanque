'use client'

import { useEffect, useState } from 'react'
import { X, Share2, Download } from 'lucide-react'
import type { Politico } from '@/lib/types'
import { cargoLabel } from '@/lib/utils'

interface ShareStoryModalProps {
  politico: Politico
  onClose: () => void
}

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

function downloadCanvas(canvas: HTMLCanvasElement, nome: string) {
  const link = document.createElement('a')
  link.download = `sempalanque-${nome.replace(/\s+/g, '-').toLowerCase()}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

export default function ShareStoryModal({ politico, onClose }: ShareStoryModalProps) {
  const [loading, setLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(/iPhone|iPad|Android/i.test(navigator.userAgent))
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const scoreColor = getScoreColor(politico.score_transparencia)
  const badge = getStatusBadge(politico)

  async function handleShare() {
    if (loading) return
    setLoading(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const el = document.getElementById('story-card-render')!
      const canvas = await html2canvas(el, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#000000',
        logging: false,
      })

      if (navigator.canShare && navigator.share) {
        canvas.toBlob(async (blob) => {
          if (!blob) { downloadCanvas(canvas, politico.nome); return }
          const file = new File([blob], 'sempalanque.png', { type: 'image/png' })
          if (navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({ files: [file], title: 'Sem Palanque' })
            } catch {
              downloadCanvas(canvas, politico.nome)
            }
          } else {
            downloadCanvas(canvas, politico.nome)
          }
        }, 'image/png')
      } else {
        downloadCanvas(canvas, politico.nome)
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
      <div className="relative flex flex-col items-center gap-5 w-full max-w-sm">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-10 flex h-8 w-8 items-center justify-center bg-[#1a1a1a] text-white/60 hover:text-white transition-colors"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Card wrapper — scales on small screens */}
        <div
          style={{
            width: 390,
            maxWidth: '100%',
            transformOrigin: 'top center',
          }}
          className="scale-[0.82] sm:scale-100"
        >
          {/* The actual story card rendered for html2canvas — off-screen */}
          <div
            id="story-card-render"
            style={{
              position: 'absolute',
              left: -9999,
              top: -9999,
              width: 390,
              height: 693,
              background: '#000',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            {/* 3px red top border */}
            <div style={{ height: 3, background: '#FF2020', flexShrink: 0 }} />

            {/* TOP SECTION */}
            <div style={{ padding: '24px 24px 0' }}>
              <span style={{
                fontSize: 11,
                fontWeight: 900,
                color: '#fff',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
                ◈ SEM PALANQUE
              </span>
            </div>

            {/* MIDDLE SECTION */}
            <div style={{
              flex: 1,
              padding: '0 24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}>
              {/* Status badge */}
              <div>
                <span style={{
                  display: 'inline-block',
                  background: badge.bg,
                  color: badge.textColor,
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  padding: '4px 10px',
                  borderRadius: 0,
                }}>
                  {badge.text}
                </span>
              </div>

              {/* Name */}
              <div style={{
                fontSize: 'clamp(36px, 8vw, 52px)',
                fontWeight: 900,
                color: '#fff',
                lineHeight: 0.92,
                marginTop: 12,
                textTransform: 'uppercase',
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
                {politico.nome}
              </div>

              {/* Meta */}
              <div style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.5)',
                marginTop: 8,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
              }}>
                {politico.partido} · {politico.siglaUf} · {cargoLabel(politico.cargo)}
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '20px 0' }} />

              {/* Score block */}
              <div>
                <div style={{
                  fontSize: 9,
                  color: 'rgba(255,255,255,0.4)',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 900,
                }}>
                  ÍNDICE DE TRANSPARÊNCIA
                </div>
                <div style={{
                  fontSize: 80,
                  fontWeight: 900,
                  lineHeight: 1,
                  color: scoreColor,
                  fontFamily: "'Space Grotesk', sans-serif",
                }}>
                  {politico.score_transparencia}
                </div>
              </div>

              {/* Condenações */}
              {politico.total_condenacoes > 0 && (
                <div style={{
                  fontSize: 16,
                  fontWeight: 900,
                  color: '#FF2020',
                  marginTop: 8,
                  fontFamily: "'Space Grotesk', sans-serif",
                  textTransform: 'uppercase',
                }}>
                  {politico.total_condenacoes} {politico.total_condenacoes === 1 ? 'CONDENAÇÃO' : 'CONDENAÇÕES'}
                </div>
              )}
            </div>

            {/* BOTTOM SECTION */}
            <div style={{
              background: '#FF2020',
              padding: '20px 24px',
              flexShrink: 0,
            }}>
              <div style={{
                color: '#fff',
                fontSize: 14,
                fontWeight: 900,
                letterSpacing: '0.07em',
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
                sempalanque.com.br
              </div>
              <div style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: 9,
                marginTop: 4,
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
                Dados: Câmara · TSE · CNJ
              </div>
            </div>
          </div>

          {/* Visible preview card (same design, visible to user) */}
          <div
            style={{
              width: 390,
              height: 693,
              background: '#000',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              fontFamily: "'Space Grotesk', sans-serif",
              borderTop: '3px solid #FF2020',
            }}
          >
            {/* TOP SECTION */}
            <div style={{ padding: '24px 24px 0' }}>
              <span style={{
                fontSize: 11,
                fontWeight: 900,
                color: '#fff',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}>
                ◈ SEM PALANQUE
              </span>
            </div>

            {/* MIDDLE SECTION */}
            <div style={{
              flex: 1,
              padding: '0 24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}>
              <div>
                <span style={{
                  display: 'inline-block',
                  background: badge.bg,
                  color: badge.textColor,
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  padding: '4px 10px',
                }}>
                  {badge.text}
                </span>
              </div>

              <div style={{
                fontSize: 'clamp(32px, 7vw, 48px)',
                fontWeight: 900,
                color: '#fff',
                lineHeight: 0.92,
                marginTop: 12,
                textTransform: 'uppercase',
                wordBreak: 'break-word',
              }}>
                {politico.nome}
              </div>

              <div style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.5)',
                marginTop: 8,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}>
                {politico.partido} · {politico.siglaUf} · {cargoLabel(politico.cargo)}
              </div>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '20px 0' }} />

              <div>
                <div style={{
                  fontSize: 9,
                  color: 'rgba(255,255,255,0.4)',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  fontWeight: 900,
                }}>
                  ÍNDICE DE TRANSPARÊNCIA
                </div>
                <div style={{
                  fontSize: 72,
                  fontWeight: 900,
                  lineHeight: 1,
                  color: scoreColor,
                }}>
                  {politico.score_transparencia}
                </div>
              </div>

              {politico.total_condenacoes > 0 && (
                <div style={{
                  fontSize: 16,
                  fontWeight: 900,
                  color: '#FF2020',
                  marginTop: 8,
                  textTransform: 'uppercase',
                }}>
                  {politico.total_condenacoes} {politico.total_condenacoes === 1 ? 'CONDENAÇÃO' : 'CONDENAÇÕES'}
                </div>
              )}
            </div>

            {/* BOTTOM SECTION */}
            <div style={{
              background: '#FF2020',
              padding: '20px 24px',
              flexShrink: 0,
            }}>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 900, letterSpacing: '0.07em' }}>
                sempalanque.com.br
              </div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, marginTop: 4 }}>
                Dados: Câmara · TSE · CNJ
              </div>
            </div>
          </div>
        </div>

        {/* Action button */}
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
                {isMobile ? 'Compartilhar nos Stories' : 'Baixar Card'}
              </>
            )}
          </button>
          <p className="text-center text-xs font-medium text-white/40">
            Salve e compartilhe nos seus stories
          </p>
        </div>
      </div>
    </div>
  )
}
