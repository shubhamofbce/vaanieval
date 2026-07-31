import { BookingButton } from './BookingButton'
import { GitHubCta } from './GitHubCta'

export function Cta() { return <section className="cta shell"><div><p className="eyebrow"><i /> Build with VaaniEval</p><h2>Make evaluation coverage part of how your agent ships.</h2><p>We are working with production Voice AI teams that need a quality system to keep pace with releases and real call behavior.</p></div><div className="cta-actions"><BookingButton className="button button-light" event="calendar_booking_final_cta_open">Talk to the founder <span aria-hidden="true">↗</span></BookingButton><GitHubCta className="cta-link" event="github_star_final_click">Inspect the code <span aria-hidden="true">↗</span></GitHubCta></div></section> }
