import PoliticoPageClient from './PoliticoPageClient'

export function generateStaticParams() {
  return [{ slug: ['index'] }]
}

export default function PoliticoPage() {
  return <PoliticoPageClient />
}
