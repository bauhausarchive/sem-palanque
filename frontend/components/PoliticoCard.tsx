import Link from 'next/link'
import type { PoliticoSearchResult } from '@/lib/types'
import { cn, cargoLabel, scoreColor } from '@/lib/utils'

interface PoliticoCardProps {
  politico: PoliticoSearchResult
  className?: string
}

function getAccentColor(politico: PoliticoSearchResult): string {
  if (politico.total_condenacoes > 0) return '#FF2020'
  if (politico.score_transparencia >= 70) return '#1A6BFF'
  return '#FFE500'
}

function getStatusLabel(politico: PoliticoSearchResult): { text: string; bg: string; textColor: string } {
  if (politico.total_condenacoes > 0) return { text: 'CONDENADO', bg: '#FF2020', textColor: '#fff' }
  if (politico.score_transparencia >= 70) return { text: 'FICHA LIMPA', bg: '#1A6BFF', textColor: '#fff' }
  return { text: 'INVESTIGADO', bg: '#FFE500', textColor: '#000' }
}

export default function PoliticoCard({ politico, className }: PoliticoCardProps) {
  const { id, nome, partido, siglaUf, cargo, total_condenacoes, score_transparencia } = politico
  const accentColor = getAccentColor(politico)
  const status = getStatusLabel(politico)

  return (
    <Link
      href={`/politico/index?id=${id}`}
      className={cn(
        'group relative flex flex-col bg-[#0a0a0a] border border-[#1a1a1a]',
        'hover:border-white transition-colors duration-150',
        className
      )}
      style={{ borderTopColor: accentColor, borderTopWidth: 2 }}
    >
      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Name + status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3
              className="text-xl font-bold text-white leading-tight truncate group-hover:text-[color:var(--accent)] transition-colors"
              style={{ '--accent': accentColor } as React.CSSProperties}
            >
              {nome}
            </h3>
          </div>
          <span
            className="flex-shrink-0 px-2 py-0.5 text-xs font-black uppercase tracking-widest"
            style={{ background: status.bg, color: status.textColor }}
          >
            {status.text}
          </span>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 bg-[#1a1a1a] text-xs font-black uppercase tracking-widest text-white">
            {partido}
          </span>
          <span className="px-2 py-0.5 bg-[#1a1a1a] text-xs font-black uppercase tracking-widest text-white">
            {siglaUf}
          </span>
          <span className="px-2 py-0.5 bg-[#1a1a1a] text-xs font-black uppercase tracking-widest text-white/50">
            {cargo === 'DEPUTADO_FEDERAL' ? 'Dep. Federal' : cargoLabel(cargo)}
          </span>
        </div>

        {/* Score bar */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-white/40">Transparência</span>
            <span
              className="text-2xl font-black tracking-tighter leading-none"
              style={{
                fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif',
                color: accentColor,
              }}
            >
              {score_transparencia}
            </span>
          </div>
          <div className="h-1 w-full bg-[#1a1a1a]">
            <div
              className="h-full transition-all"
              style={{ width: `${score_transparencia}%`, background: accentColor }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-[#1a1a1a] min-h-[44px]">
          {total_condenacoes > 0 ? (
            <span className="text-xs font-black uppercase tracking-widest text-[#FF2020]">
              {total_condenacoes} {total_condenacoes === 1 ? 'condenação' : 'condenações'}
            </span>
          ) : (
            <span className="text-xs font-black uppercase tracking-widest text-[#1A6BFF]">
              Sem condenações
            </span>
          )}
          <span className="text-xs font-black uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">
            Ver perfil →
          </span>
        </div>
      </div>
    </Link>
  )
}
