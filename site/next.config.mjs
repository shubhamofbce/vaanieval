import createMDX from '@next/mdx'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const withMDX = createMDX({})
const root = path.dirname(fileURLToPath(import.meta.url))

export default withMDX({
  outputFileTracingRoot: root,
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
  poweredByHeader: false,
  async redirects() {
    return [
      { source: '/login', destination: process.env.NEXT_PUBLIC_APP_URL || 'https://app.vaanieval.com/login', permanent: false },
      { source: '/dashboard', destination: process.env.NEXT_PUBLIC_APP_URL || 'https://app.vaanieval.com/dashboard', permanent: false },
    ]
  },
})
