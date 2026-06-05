'use client'

import './globals.css'
import { Space_Grotesk, DM_Sans } from 'next/font/google'
import Link from 'next/link'
import { useState } from 'react'
import { Shield, Github, Menu, X } from 'lucide-react'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <html lang="pt-BR">
      <head>
        <title>Sem Palanque</title>
        <meta
          name="description"
          content="Condenações, gastos do mandato e coerência de discurso. Tudo com dados abertos do governo federal."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var redirect = sessionStorage.getItem('redirect');
            if (redirect && redirect !== '/') {
              sessionStorage.removeItem('redirect');
              window.history.replaceState(null, null, '/sem-palanque' + redirect);
            }
          })();
        `}} />
      </head>
      <body className={`${spaceGrotesk.variable} ${dmSans.variable} min-h-screen bg-black text-white`}
        style={{ fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif' }}>
        {/* Red top border */}
        <div className="h-[2px] w-full bg-[#FF2020]" />

        {/* Navigation */}
        <header className="sticky top-0 z-50 bg-black border-b border-[#1a1a1a]">
          <div className="container mx-auto flex h-14 items-center justify-between px-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#FF2020]" />
              <span
                className="text-lg font-black tracking-tight text-white"
                style={{ fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif' }}
              >
                SEM <span className="text-[#FF2020]">PALANQUE</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-8 md:flex">
              <Link
                href="/"
                className="text-xs font-black uppercase tracking-widest text-white/50 hover:text-white transition-colors"
              >
                Início
              </Link>
              <Link
                href="/comparador"
                className="text-xs font-black uppercase tracking-widest text-white/50 hover:text-white transition-colors"
              >
                Comparador
              </Link>
              <Link
                href="/#fontes"
                className="text-xs font-black uppercase tracking-widest text-white/50 hover:text-white transition-colors"
              >
                Fontes
              </Link>
            </nav>

            <div className="flex items-center gap-4">
              <Link
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden text-white/50 hover:text-white transition-colors md:block"
                aria-label="GitHub"
              >
                <Github className="h-4 w-4" />
              </Link>
              <button
                className="p-2 text-white/50 hover:text-white transition-colors md:hidden"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Menu"
              >
                {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileOpen && (
            <div className="border-t border-[#1a1a1a] bg-black px-4 py-4 md:hidden">
              <nav className="flex flex-col gap-4">
                <Link
                  href="/"
                  className="text-xs font-black uppercase tracking-widest text-white/50 hover:text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  Início
                </Link>
                <Link
                  href="/comparador"
                  className="text-xs font-black uppercase tracking-widest text-white/50 hover:text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  Comparador
                </Link>
                <Link
                  href="/#fontes"
                  className="text-xs font-black uppercase tracking-widest text-white/50 hover:text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  Fontes
                </Link>
              </nav>
            </div>
          )}
        </header>

        {/* Main content */}
        <main className="flex-1">{children}</main>

        {/* Footer */}
        <footer className="border-t border-[#1a1a1a] bg-black py-12 mt-20">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="h-4 w-4 text-[#FF2020]" />
                  <span
                    className="font-black text-white"
                    style={{ fontFamily: 'var(--font-space-grotesk), Space Grotesk, sans-serif' }}
                  >
                    SEM <span className="text-[#FF2020]">PALANQUE</span>
                  </span>
                </div>
                <p className="text-sm text-white/50">
                  Sem Palanque. Só dados.
                </p>
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-white mb-4">Fontes de Dados</h4>
                <ul className="space-y-2 text-sm text-white/50">
                  <li><a href="https://dadosabertos.camara.leg.br" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">API Câmara dos Deputados</a></li>
                  <li><a href="https://legis.senado.leg.br/dadosabertos" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">API Senado Federal</a></li>
                  <li><a href="https://www.tse.jus.br/eleicoes/estatisticas/repositorio-de-dados-eleitorais" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">TSE — Dados Eleitorais</a></li>
                  <li><a href="https://portaldatransparencia.gov.br" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Portal da Transparência</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-white mb-4">Projeto</h4>
                <ul className="space-y-2 text-sm text-white/50">
                  <li><a href="https://github.com" className="hover:text-white transition-colors">Código Aberto (GitHub)</a></li>
                  <li><Link href="/comparador" className="hover:text-white transition-colors">Comparador de Discursos</Link></li>
                </ul>
              </div>
            </div>
            <div className="mt-10 border-t border-[#1a1a1a] pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/30">
              <span>Dados obtidos de fontes abertas. Nenhuma informação é produzida editorialmente. MIT License.</span>
              <span>Atualizado em {new Date().toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
