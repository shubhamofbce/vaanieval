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
      /* The design-partner program is retired. The page was indexed and linked
         from published posts, so this is permanent rather than a 404: the
         booking section on the home page is where that intent now lands.
         Production does NOT use this entry - the root vercel.json still uses
         legacy `builds` + `routes`, which bypasses redirects() entirely, so
         the live rule lives there too. Keep the two in step. */
      { source: '/design-partners', destination: '/#demo', permanent: true },
    ]
  },
})
