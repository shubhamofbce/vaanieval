import { BookingButton } from './BookingButton'

export function Cta() {
  return <section className="cta shell">
    <div>
      <p className="eyebrow"><i /> Own your benchmark</p>
      <h2>Choose voice models using evidence from your own calls.</h2>
      <p>See how a private benchmark runs inside your environment, on your production scenarios, across the models you are considering.</p>
    </div>
    <div className="cta-actions">
      <BookingButton className="button button-light" event="calendar_booking_final_cta_open">Book a call <span aria-hidden="true">↗</span></BookingButton>
      <p className="cta-note">30 minutes. Bring your model-selection question.</p>
    </div>
  </section>
}
