import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { requestMagicLink, verifyMagicLink } from '../api/endpoints'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

  async function handleRequestLink(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setMessage('')
    setIsSending(true)
    try {
      const result = await requestMagicLink(email)
      setMessage(result.message)
      const match = result.message.match(/Dev token generated:\s*(\S+)/)
      if (match?.[1]) {
        setToken(match[1])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request magic link')
    } finally {
      setIsSending(false)
    }
  }

  async function handleVerify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setIsVerifying(true)
    try {
      await verifyMagicLink(token)
      navigate('/onboarding')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Token verification failed')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="page center">
      <div className="panel narrow">
        <h1>Sign in</h1>
        <p>Request a magic link token with your email.</p>
        <form onSubmit={handleRequestLink}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="you@example.com"
          />
          <button type="submit" disabled={isSending}>
            {isSending ? 'Sending...' : 'Request magic link'}
          </button>
        </form>

        <form onSubmit={handleVerify}>
          <label htmlFor="token">Magic token</label>
          <input
            id="token"
            type="text"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            required
            placeholder="Paste token"
          />
          <button type="submit" disabled={isVerifying}>
            {isVerifying ? 'Verifying...' : 'Verify and sign in'}
          </button>
        </form>

        {message && <p className="note">{message}</p>}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  )
}
