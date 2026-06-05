/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  // Set basePath to your GitHub Pages repo name, e.g. '/politico-transparente'
  // Leave empty for custom domain or root deployment
  basePath: '/sem-palanque',
  assetPrefix: '/sem-palanque',
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.fichalimpaplus.com.br',
  },
}

module.exports = nextConfig
