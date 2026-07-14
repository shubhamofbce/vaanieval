import { TrackedLink } from './TrackedLink'
import { GitHubCta } from './GitHubCta'

export function Cta() { return <section className="cta shell"><div><p className="eyebrow">Open-source voice-agent evaluation</p><h2>Inspect the calls behind your agent’s quality score.</h2><p>Star the project, self-host the workspace, or help shape the next evaluation capabilities as a design partner.</p></div><div className="cta-actions"><GitHubCta className="button button-light" event="github_star_final_click" /><TrackedLink className="cta-link" href="/design-partners" event="design_partner_cta_click">Apply as a design partner <span aria-hidden="true">→</span></TrackedLink></div></section> }
