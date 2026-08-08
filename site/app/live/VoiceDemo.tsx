'use client'

import { Room, RoomEvent } from 'livekit-client'
import { useEffect, useRef, useState } from 'react'

type State = 'ready' | 'connecting' | 'connected' | 'error'

export function VoiceDemo() {
  const roomRef = useRef<Room | null>(null)
  const [state, setState] = useState<State>('ready')
  const [message, setMessage] = useState('Talk to the VaaniEval voice assistant.')

  useEffect(() => () => { roomRef.current?.disconnect() }, [])

  async function connect() {
    setState('connecting')
    setMessage('Connecting securely…')
    try {
      const response = await fetch('/api/livekit/token', { method: 'POST' })
      const details = await response.json()
      if (!response.ok) throw new Error(details.error || 'Unable to create a call.')
      const room = new Room()
      roomRef.current = room
      room.on(RoomEvent.TrackSubscribed, track => {
        if (track.kind === 'audio') document.body.appendChild(track.attach())
      })
      room.on(RoomEvent.TrackUnsubscribed, track => {
        track.detach().forEach(element => element.remove())
      })
      room.on(RoomEvent.Disconnected, () => {
        roomRef.current = null
        setState('ready')
        setMessage('Call ended. Your recording is being saved.')
      })
      await room.connect(details.serverUrl, details.participantToken)
      await room.localParticipant.setMicrophoneEnabled(true)
      setState('connected')
      setMessage('Connected — say hello.')
    } catch (error) {
      roomRef.current?.disconnect()
      roomRef.current = null
      setState('error')
      setMessage(error instanceof Error ? error.message : 'Unable to connect.')
    }
  }

  function disconnect() { roomRef.current?.disconnect() }

  return <section className="voice-demo">
    <p className="voice-kicker">LIVE VOICE DEMO</p>
    <h1>Talk to VaaniEval.</h1>
    <p className="voice-lede">Ask about voice-agent quality, evaluation coverage, and VaaniEval. Your browser asks for microphone access only when you connect.</p>
    <div className={`voice-orb ${state}`} aria-hidden="true"><i /><i /><i /></div>
    <button className="voice-button" onClick={state === 'connected' ? disconnect : connect} disabled={state === 'connecting'}>
      {state === 'connected' ? 'End conversation' : state === 'connecting' ? 'Connecting…' : 'Start conversation'}
    </button>
    <p className="voice-status" role="status">{message}</p>
    <p className="voice-notice">By connecting, you consent to this demo call being recorded for quality and evaluation purposes.</p>
  </section>
}
