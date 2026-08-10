import { ImageResponse } from 'next/og'

export const alt = 'VaaniEval, production observability and evaluation for Voice AI'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '72px', background: 'linear-gradient(135deg,#05100f 0%,#0b201d 60%,#0e2b26 100%)', color: '#eef6f3', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px', fontSize: '30px', fontWeight: 800 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '58px', height: '58px', borderRadius: '16px', background: '#37e0b8', color: '#04211c' }}>V</div>
        VaaniEval
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', fontSize: '32px', color: '#37e0b8', letterSpacing: '4px', fontWeight: 700 }}>THE RELIABILITY PLATFORM FOR VOICE AI</div>
        <div style={{ display: 'flex', fontSize: '66px', lineHeight: 1.05, fontWeight: 800, letterSpacing: '-3px', maxWidth: '1000px', marginTop: '22px' }}>Know what happened. Improve what happens next.</div>
        <div style={{ display: 'flex', fontSize: '27px', color: '#9db4b0', marginTop: '26px' }}>Production observability and evaluation inside infrastructure you control</div>
      </div>
    </div>,
    size,
  )
}
