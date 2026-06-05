'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import type { ComparacaoResult } from '@/lib/types'
import { cn, formatDate, similaridadeLabel } from '@/lib/utils'

interface DiscursoComparadorProps {
  resultados: ComparacaoResult[]
}

export default function DiscursoComparador({ resultados }: DiscursoComparadorProps) {
  return (
    <div className="space-y-3">
      {resultados.map((r, i) => (
        <ComparacaoCard key={i} resultado={r} />
      ))}
    </div>
  )
}

function ComparacaoCard({ resultado }: { resultado: ComparacaoResult }) {
  const [expanded, setExpanded] = useState(false)

  const veredictoConfig = {
    cumprida: {
      label: 'CUMPRIDA',
      borderColor: '#22c55e',
      labelBg: '#22c55e',
      labelText: '#000',
      checkIcon: '✓',
    },
    contradita: {
      label: 'CONTRADITA',
      borderColor: '#FF2020',
      labelBg: '#FF2020',
      labelText: '#fff',
      checkIcon: '✗',
    },
    sem_evidencia: {
      label: 'SEM EVIDÊNCIA',
      borderColor: '#444',
      labelBg: '#1a1a1a',
      labelText: '#fff',
      checkIcon: '–',
    },
  }

  const config = veredictoConfig[resultado.veredicto]
  const scorePercent = (resultado.score_geral * 100).toFixed(0)
  const scoreColor =
    resultado.score_geral >= 0.6
      ? '#22c55e'
      : resultado.score_geral >= 0.35
      ? '#FFE500'
      : '#FF2020'

  return (
    <div
      className="bg-[#0a0a0a] border border-[#1a1a1a]"
      style={{ borderLeftColor: config.borderColor, borderLeftWidth: 4 }}
    >
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className="px-2 py-0.5 text-xs font-black uppercase tracking-widest"
              style={{ background: config.labelBg, color: config.labelText }}
            >
              {config.checkIcon} {config.label}
            </span>
            {resultado.promessa.tema && (
              <span className="px-2 py-0.5 bg-[#1a1a1a] text-xs font-black uppercase tracking-widest text-white/50">
                {resultado.promessa.tema}
              </span>
            )}
            <span className="text-xs text-white/30">
              {formatDate(resultado.promessa.dataPromessa)} · {resultado.promessa.fonte}
            </span>
          </div>

          {/* Score */}
          <div className="flex-shrink-0 text-right">
            <div
              className="text-3xl font-black leading-none tracking-tighter"
              style={{
                fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif',
                color: scoreColor,
              }}
            >
              {scorePercent}%
            </div>
            <div className="text-xs font-black uppercase tracking-widest text-white/30">coerência</div>
          </div>
        </div>

        {/* Promise text */}
        <p className="text-sm font-medium text-white leading-snug mb-3">
          &ldquo;{resultado.promessa.descricao}&rdquo;
        </p>

        {/* Toggle */}
        {resultado.discursos_relacionados.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {resultado.discursos_relacionados.length} discurso
            {resultado.discursos_relacionados.length !== 1 ? 's' : ''} relacionado
            {resultado.discursos_relacionados.length !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Expanded discursos */}
      {expanded && (
        <div className="border-t border-[#1a1a1a]">
          {resultado.discursos_relacionados.map((dr, i) => {
            const { label, color } = similaridadeLabel(dr.similaridade)
            return (
              <div key={i} className="p-4 border-b border-[#1a1a1a] last:border-b-0">
                <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs text-white/30">
                    {formatDate(dr.discurso.dataHoraInicio)}
                    {dr.discurso.faseEvento && ` · ${dr.discurso.faseEvento}`}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className={cn('text-xs font-black uppercase tracking-widest', color)}>{label}</span>
                    <span className="text-xs font-black text-white/30 tabular-nums">
                      {(dr.similaridade * 100).toFixed(0)}% sim.
                    </span>
                    {dr.discurso.urlTexto && (
                      <a
                        href={dr.discurso.urlTexto}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/30 hover:text-white"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
                {dr.trecho_destacado ? (
                  <blockquote
                    className="pl-4 text-sm text-white/60 leading-relaxed italic"
                    style={{ borderLeft: '4px solid #FFE500' }}
                  >
                    &ldquo;{dr.trecho_destacado}&rdquo;
                  </blockquote>
                ) : (
                  <p className="text-sm text-white/60 leading-relaxed line-clamp-3">
                    {dr.discurso.sumario}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
