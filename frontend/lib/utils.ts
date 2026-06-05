import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr))
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value)
}

export function scoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-500'
  if (score >= 40) return 'text-amber-500'
  return 'text-red-500'
}

export function scoreBg(score: number): string {
  if (score >= 70) return 'bg-emerald-500'
  if (score >= 40) return 'bg-amber-500'
  return 'bg-red-500'
}

export function cargoLabel(cargo: string): string {
  const labels: Record<string, string> = {
    DEPUTADO_FEDERAL: 'Deputado Federal',
    SENADOR: 'Senador',
    GOVERNADOR: 'Governador',
    PREFEITO: 'Prefeito',
    VEREADOR: 'Vereador',
    DEPUTADO_ESTADUAL: 'Deputado Estadual',
    PRESIDENTE: 'Presidente',
    MINISTRO: 'Ministro',
    PRE_CANDIDATO_PRESIDENCIAL: 'Pré-candidato 2026',
  }
  return labels[cargo] ?? cargo
}

export function similaridadeLabel(score: number): {
  label: string
  color: string
} {
  if (score >= 0.75)
    return { label: 'Alta similaridade', color: 'text-emerald-500' }
  if (score >= 0.5)
    return { label: 'Similaridade moderada', color: 'text-amber-500' }
  if (score >= 0.25)
    return { label: 'Baixa similaridade', color: 'text-orange-500' }
  return { label: 'Contradição detectada', color: 'text-red-500' }
}
