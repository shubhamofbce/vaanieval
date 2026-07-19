import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { type MouseEvent, useEffect, useId, useRef, useState } from 'react'

const bookingUrl = 'https://calendar.app.google/5cNH8hB13LoC39Qk7'
const bookingEmbedUrl = 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ09AykNKTGy837qj-lPF91WJRGj7HnV-EYy_sK9iSDwuPFQCoJiR_JsONSysO4_9BdP6_eq40rb?gv=true'

export function BookingButton() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (isOpen && !dialogRef.current?.open) {
      dialogRef.current?.showModal()
    }
  }, [isOpen])

  function closeBooking() {
    dialogRef.current?.close()
    setIsOpen(false)
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      closeBooking()
    }
  }

  return <>
    <button className="login-booking-button" type="button" onClick={() => setIsOpen(true)} aria-haspopup="dialog">
      <FontAwesomeIcon icon="calendar" /> Book a demo
    </button>
    <dialog
      ref={dialogRef}
      className="booking-dialog"
      aria-labelledby={titleId}
      onClick={handleBackdropClick}
      onClose={() => setIsOpen(false)}
    >
      <div className="booking-dialog-header">
        <div>
          <p className="login-eyebrow">Schedule a conversation</p>
          <h2 id={titleId}>Book time with VaaniEval</h2>
        </div>
        <button className="booking-dialog-close" type="button" onClick={closeBooking} aria-label="Close booking calendar">×</button>
      </div>
      <p className="booking-dialog-copy">Choose a time that works for you. You can book without leaving this page.</p>
      <div className="booking-frame">
        {isOpen && <iframe src={bookingEmbedUrl} title="Book a meeting with VaaniEval" />}
      </div>
      <p className="booking-fallback">
        Calendar not loading? <a href={bookingUrl} target="_blank" rel="noreferrer">Open the booking page</a>.
      </p>
    </dialog>
  </>
}
