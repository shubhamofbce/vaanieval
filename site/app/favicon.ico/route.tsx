import { ImageResponse } from 'next/og'
import logo from '../../../frontend/src/assets/vaanievallogo.jpg'

export const dynamic = 'force-dynamic'

export function GET(request: Request) {
  return new ImageResponse(
    <img
      alt=""
      height="48"
      src={new URL(logo.src, request.url).toString()}
      width="48"
    />,
    {
      height: 48,
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
      },
      width: 48,
    },
  )
}
