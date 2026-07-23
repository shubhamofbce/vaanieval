import { BookingButton } from './BookingButton'
import { GitHubCta } from './GitHubCta'

export function Cta() { return <section className="cta shell"><div><p className="eyebrow">Talk through your QA workflow</p><h2>See how VaaniEval fits your voice-agent operation.</h2><p>Book a focused walkthrough of the evaluation workspace, or inspect and self-host the open-source project under AGPL-3.0.</p></div><div className="cta-actions"><BookingButton className="button button-light" event="calendar_booking_final_cta_open">Book a demo</BookingButton><GitHubCta className="cta-link" event="github_star_final_click">View on GitHub <span aria-hidden="true">→</span></GitHubCta></div></section> }
