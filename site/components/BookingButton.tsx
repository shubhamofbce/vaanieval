'use client'

import { track } from '@vercel/analytics'
import { type MouseEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react'
import { siteConfig } from '@/lib/site'

type BookingButtonProps = {
  children?: ReactNode
  className?: string
  event?: string
}

export function BookingButton({
  children = 'Book a demo',
  className = 'button',
  event = 'calendar_booking_open',
}: BookingButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (isOpen && !dialogRef.current?.open) {
      dialogRef.current?.showModal()
    }
  }, [isOpen])

  function openBooking() {
    track(event, { link_url: siteConfig.bookingUrl })
    window.gtag?.('event', event, { link_url: siteConfig.bookingUrl })
    setIsOpen(true)
  }

  function closeBooking() {
    dialogRef.current?.close()
    setIsOpen(false)
  }

  function openProductWalkthrough() {
    track('video_product_walkthrough_booking_dialog_open', { link_url: siteConfig.productDemoUrl })
    window.gtag?.('event', 'video_product_walkthrough_booking_dialog_open', { link_url: siteConfig.productDemoUrl })
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      closeBooking()
    }
  }

  return <>
    <button className={className} type="button" onClick={openBooking} aria-haspopup="dialog">
      {children}
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
          <p className="eyebrow">Schedule a conversation</p>
          <h2 id={titleId}>Book time with VaaniEval</h2>
        </div>
        <button className="booking-dialog-close" type="button" onClick={closeBooking} aria-label="Close booking calendar">×</button>
      </div>
      <p className="booking-dialog-copy">Choose a time that works for you. You can book without leaving this page.</p>
      <div className="booking-frame">
        {isOpen && <iframe src={siteConfig.bookingEmbedUrl} title="Book a meeting with VaaniEval" />}
      </div>
      <p className="booking-fallback">
        Calendar not loading? <a href={siteConfig.bookingUrl} target="_blank" rel="noreferrer">Open the booking page</a>.
      </p>
      <p className="booking-video-option">
        Want a quick overview first? <a href={siteConfig.productDemoUrl} target="_blank" rel="noreferrer" onClick={openProductWalkthrough}>Watch the product walkthrough in a new tab</a>.
      </p>
    </dialog>
  </>
}
