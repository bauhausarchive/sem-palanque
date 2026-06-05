// Catch-all route for politician profile pages.
// With Next.js static export, we use [...slug] + generateStaticParams returning []
// which produces a single static shell at /politico/index.html.
// The actual politician ID is read client-side from window.location.

import PoliticoPageClient from './PoliticoPageClient'

export function generateStaticParams() {
  // Pre-generate pages for all known politician IDs
  const ids = ['1', '2', '3', '4', '5', '6']
  return ids.map((id) => ({ slug: [id] }))
}

export default function PoliticoPage() {
  return <PoliticoPageClient />
}
