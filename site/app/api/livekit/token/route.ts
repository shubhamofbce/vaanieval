import { AccessToken, RoomConfiguration } from 'livekit-server-sdk'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST() {
  const url = process.env.LIVEKIT_URL
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  if (!url || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Voice demo is not configured.' }, { status: 503 })
  }

  const room = `vaanieval-web-${crypto.randomUUID().slice(0, 12)}`
  const identity = `web-guest-${crypto.randomUUID().slice(0, 12)}`
  const token = new AccessToken(apiKey, apiSecret, { identity, name: 'VaaniEval website visitor', ttl: '15m' })
  token.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true })
  token.roomConfig = RoomConfiguration.fromJson({ agents: [{ agent_name: 'demo-assistant' }] })
  return NextResponse.json({ serverUrl: url, participantToken: await token.toJwt() }, { headers: { 'Cache-Control': 'no-store' } })
}
