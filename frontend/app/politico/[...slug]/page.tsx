// Catch-all route for politician profile pages.
// With Next.js static export, we use [...slug] + generateStaticParams returning []
// which produces a single static shell at /politico/index.html.
// The actual politician ID is read client-side from window.location.

import PoliticoPageClient from './PoliticoPageClient'

export function generateStaticParams() {
  // Next.js static export requires at least one entry for catch-all routes.
  // We return a placeholder; the client component handles any real ID dynamically.
  return [{ slug: ['__'] }]
}

export default function PoliticoPage() {
  return <PoliticoPageClient />
}
