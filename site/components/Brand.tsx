import Link from 'next/link'
import logo from '../../frontend/src/assets/vaanievallogo.jpg'

export function Brand({ href }: { href?: string }) {
  const inner = <><span className="brand-logo"><img className="brand-mark" src={logo.src} alt="" width={32} height={32} /></span><span>VaaniEval</span></>
  return href ? <Link className="brand" href={href} aria-label="VaaniEval home">{inner}</Link> : <div className="brand">{inner}</div>
}
