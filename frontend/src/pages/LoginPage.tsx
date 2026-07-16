import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { requestMagicLink, verifyMagicLink } from '../api/endpoints'
import logo from '../assets/vaanievallogo.jpg'

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tokenFromUrl = searchParams.get('token')
  const autoVerifyToken = useRef<string | null>(null)
  const [email, setEmail] = useState('')
  const [token, setToken] = useState(tokenFromUrl ?? '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isTokenPanelOpen, setIsTokenPanelOpen] = useState(Boolean(tokenFromUrl))

  useEffect(() => {
    if (!tokenFromUrl || autoVerifyToken.current === tokenFromUrl) {
      return
    }

    autoVerifyToken.current = tokenFromUrl
    setToken(tokenFromUrl)
    setMessage('Signing you in from your magic link...')
    setError('')
    setIsTokenPanelOpen(true)
    setIsVerifying(true)

    verifyMagicLink(tokenFromUrl)
      .then(() => navigate('/onboarding'))
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Token verification failed')
        setMessage('We could not complete sign-in from that link. Paste a fresh token below.')
      })
      .finally(() => setIsVerifying(false))
  }, [navigate, tokenFromUrl])

  const tokenAvailable = token.trim().length > 0

  function handleToggleTokenPanel() {
    setIsTokenPanelOpen((current) => !current)
    if (!isTokenPanelOpen) {
      setError('')
    }
  }

  async function handleRequestLink(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setMessage('Preparing your secure sign-in link...')
    setIsSending(true)
    try {
      const result = await requestMagicLink(email)
      setMessage(result.message)
      const match = result.message.match(/Dev token generated:\s*(\S+)/)
      if (match?.[1]) {
        setToken(match[1])
        setIsTokenPanelOpen(true)
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
    setMessage('')
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
    <div className="login-page">
      <section className="login-hero" aria-label="VaaniEval sign in">
        <div className="login-brand">
          <img className="login-brand-mark" src={logo} alt="VaaniEval" />
          <span>VaaniEval</span>
        </div>

        <div className="login-hero-copy">
          <p className="login-eyebrow">Voice AI evaluation workspace</p>
          <h1>Understand every agent conversation before it becomes a customer issue.</h1>
          <p>
            Import calls, score transcripts, and track provider quality from one focused review
            workspace.
          </p>
        </div>

        <div className="login-demo" aria-labelledby="login-demo-title">
          <div className="login-demo-heading">
            <span className="login-eyebrow">Product demo</span>
            <strong id="login-demo-title">See the workspace before you sign in.</strong>
          </div>
          <div className="login-demo-video">
            <iframe
              src="https://www.youtube.com/embed/6T0CatDgoEA"
              title="VaaniEval product demo"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </div>

        <div className="login-signal-grid" aria-label="Product highlights">
          <div>
            <span><FontAwesomeIcon icon="wave-square" /></span>
            <strong>Audio review</strong>
            <p>Replay calls with synchronized transcript context.</p>
          </div>
          <div>
            <span><FontAwesomeIcon icon="chart-line" /></span>
            <strong>Quality scoring</strong>
            <p>Spot risk trends across agents and conversations.</p>
          </div>
          <div>
            <span><FontAwesomeIcon icon="shield" /></span>
            <strong>Workspace scoped</strong>
            <p>Secure magic-link access with provider data separated.</p>
          </div>
        </div>
      </section>

      <section className="login-card" aria-label="Sign in form">
        <div className="login-card-header">
          <span className="login-card-icon"><FontAwesomeIcon icon="lock" /></span>
          <div>
            <h2>Sign in to your workspace</h2>
            <p>Use your work email and we will send a secure magic link.</p>
          </div>
        </div>

        <form className="login-form" onSubmit={handleRequestLink}>
          <label htmlFor="email">Work email</label>
          <div className="login-input-shell">
            <FontAwesomeIcon icon="user" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder="you@company.com"
              autoComplete="email"
            />
          </div>
          <button className="login-primary-button" type="submit" disabled={isSending}>
            {isSending ? (
              <>
                <FontAwesomeIcon icon="circle-notch" spin /> Sending link
              </>
            ) : (
              <>
                <FontAwesomeIcon icon="link" /> Send magic link
              </>
            )}
          </button>
        </form>

        <div className="login-divider">
          <span>Already have a token?</span>
        </div>

        <button
          className="login-token-toggle"
          type="button"
          onClick={handleToggleTokenPanel}
          aria-expanded={isTokenPanelOpen}
        >
          <FontAwesomeIcon icon="key" />
          {isTokenPanelOpen ? 'Hide token entry' : 'Enter magic token'}
        </button>

        {isTokenPanelOpen && (
          <form className="login-token-form" onSubmit={handleVerify}>
            <label htmlFor="token">Magic token</label>
            <div className="login-input-shell">
              <FontAwesomeIcon icon="key" />
              <input
                id="token"
                type="text"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                required
                placeholder="Paste token"
                autoComplete="one-time-code"
              />
            </div>
            <button className="login-secondary-button" type="submit" disabled={isVerifying || !tokenAvailable}>
              {isVerifying ? (
                <>
                  <FontAwesomeIcon icon="circle-notch" spin /> Verifying
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon="check-circle" /> Verify and continue
                </>
              )}
            </button>
          </form>
        )}

        {(message || error) && (
          <div className={`login-alert ${error ? 'login-alert-error' : 'login-alert-note'}`} role="status">
            <FontAwesomeIcon icon={error ? 'exclamation-triangle' : 'circle-info'} />
            <p>{error || message}</p>
          </div>
        )}
      </section>
    </div>
  )
}
