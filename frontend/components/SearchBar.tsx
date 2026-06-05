'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2, X } from 'lucide-react'
import { searchPoliticos } from '@/lib/api'
import type { PoliticoSearchResult } from '@/lib/types'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  placeholder?: string
  className?: string
  autoFocus?: boolean
  onSelect?: (politico: PoliticoSearchResult) => void
}

export default function SearchBar({
  placeholder = 'Buscar político por nome…',
  className,
  autoFocus = false,
  onSelect,
}: SearchBarProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PoliticoSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    setActiveIndex(-1)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (val.trim().length < 2) {
      setResults([])
      setOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await searchPoliticos(val)
        setResults(res.data)
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && results[activeIndex]) {
        selectResult(results[activeIndex])
      } else if (query.trim()) {
        router.push(`/?q=${encodeURIComponent(query.trim())}`)
        setOpen(false)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  function selectResult(politico: PoliticoSearchResult) {
    setQuery(politico.nome)
    setOpen(false)
    if (onSelect) {
      onSelect(politico)
    } else {
      router.push(`/politico/${politico.id}`)
    }
  }

  function clear() {
    setQuery('')
    setResults([])
    setOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div className="relative flex items-center">
        {loading ? (
          <Loader2 className="absolute left-4 h-4 w-4 animate-spin text-white/40" />
        ) : (
          <Search className="absolute left-4 h-4 w-4 text-white/40" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className={cn(
            'w-full border-2 border-white bg-black py-4 pl-12 pr-12 text-sm font-medium text-white',
            'placeholder:text-white/30',
            'focus:outline-none focus:border-[#FFE500]',
            'transition-colors'
          )}
          aria-label="Buscar político"
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {query && (
          <button
            onClick={clear}
            className="absolute right-4 text-white/40 hover:text-white transition-colors"
            aria-label="Limpar busca"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown results */}
      {open && results.length > 0 && (
        <ul
          className="absolute z-50 mt-0 w-full border-2 border-t-0 border-white bg-black overflow-y-auto max-h-72 shadow-2xl"
          role="listbox"
        >
          {results.map((p, i) => (
            <li
              key={p.id}
              role="option"
              aria-selected={i === activeIndex}
              className={cn(
                'flex cursor-pointer items-center gap-3 px-4 py-3 text-sm transition-colors border-b border-[#1a1a1a]',
                i === activeIndex ? 'bg-white text-black' : 'hover:bg-white hover:text-black'
              )}
              onMouseDown={() => selectResult(p)}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <div
                className={cn(
                  'flex h-8 w-8 flex-shrink-0 items-center justify-center text-sm font-black',
                  i === activeIndex ? 'bg-black text-white' : 'bg-[#1a1a1a] text-white'
                )}
                style={{ fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif' }}
              >
                {p.nome.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{p.nome}</p>
                <p className={cn('text-xs', i === activeIndex ? 'text-black/50' : 'text-white/40')}>
                  {p.cargo === 'DEPUTADO_FEDERAL' ? 'Dep. Federal' : p.cargo} · {p.partido}/{p.siglaUf}
                </p>
              </div>
              {p.total_condenacoes > 0 && (
                <span
                  className={cn(
                    'ml-auto flex-shrink-0 px-2 py-0.5 text-xs font-black uppercase tracking-widest',
                    i === activeIndex ? 'bg-[#FF2020] text-white' : 'bg-[#FF2020] text-white'
                  )}
                >
                  CONDENADO
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {open && !loading && query.trim().length >= 2 && results.length === 0 && (
        <div className="absolute z-50 mt-0 w-full border-2 border-t-0 border-white bg-black px-4 py-3 text-sm text-white/40">
          Nenhum político encontrado para &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  )
}
