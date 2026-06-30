import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { IconProp } from '@fortawesome/fontawesome-svg-core'

const SETUP_STEPS: Array<{
  number: string
  icon: IconProp
  title: string
  description: string
  link: string
  action: string
}> = [
  {
    number: '1',
    icon: 'plug',
    title: 'Connect your voice provider',
    description: 'Add your ElevenLabs or Vapi account so VaaniEval can read your agents and calls.',
    link: '/settings/provider',
    action: 'Manage providers',
  },
  {
    number: '2',
    icon: 'users',
    title: 'Choose an agent',
    description: 'Sync your agents and select the one whose calls you want to review.',
    link: '/settings/agents',
    action: 'View agents',
  },
  {
    number: '3',
    icon: 'file-import',
    title: 'Import conversations',
    description: 'Choose an agent and date range. Imported calls are evaluated in the background.',
    link: '/imports/new',
    action: 'Import calls',
  },
  {
    number: '4',
    icon: 'comments',
    title: 'Review what needs attention',
    description: 'Start with the lowest-quality calls, see why they failed, and decide what to fix.',
    link: '/conversations',
    action: 'Review conversations',
  },
]

const PRODUCT_AREAS: Array<{
  icon: IconProp
  title: string
  description: string
  link: string
}> = [
  {
    icon: 'comments',
    title: 'Conversations',
    description: 'Your daily QA inbox. Listen to calls, read transcripts, inspect scores, and find failures.',
    link: '/conversations',
  },
  {
    icon: 'chart-line',
    title: 'Dashboard',
    description: 'See QA pass rate, evaluation coverage, score trends, and performance by agent.',
    link: '/dashboard',
  },
  {
    icon: 'users',
    title: 'Agents',
    description: 'Sync agents from connected providers and open calls for a specific agent.',
    link: '/settings/agents',
  },
  {
    icon: 'file-import',
    title: 'Imports',
    description: 'Bring historical calls into VaaniEval for a chosen agent and date range.',
    link: '/imports/new',
  },
  {
    icon: 'plug',
    title: 'Providers',
    description: 'Connect voice platforms and configure the model used to evaluate conversations.',
    link: '/settings/provider',
  },
]

export function OnboardingPage() {
  return (
    <section className="page onboarding-page">
      <section className="panel onboarding-hero">
        <div>
          <span className="onboarding-eyebrow">VaaniEval home</span>
          <h1>Find the voice-agent calls that need fixing.</h1>
          <p>
            Import real conversations from your voice provider. VaaniEval scores each call, explains the weakest behavior,
            and keeps the most important failures at the top of your review inbox.
          </p>
        </div>
        <div className="onboarding-hero-actions">
          <Link to="/conversations" className="onboarding-primary-action">
            <FontAwesomeIcon icon="comments" />
            <span>Review calls needing attention</span>
          </Link>
          <Link to="/imports/new" className="onboarding-secondary-action">
            <FontAwesomeIcon icon="file-import" />
            <span>Import conversations</span>
          </Link>
        </div>
      </section>

      <section className="onboarding-section" aria-labelledby="setup-heading">
        <div className="onboarding-section-heading">
          <div>
            <span className="onboarding-eyebrow">First time here?</span>
            <h2 id="setup-heading">Get from provider to useful QA in four steps</h2>
          </div>
          <p>Already connected and imported? Go straight to Conversations.</p>
        </div>

        <div className="onboarding-steps">
          {SETUP_STEPS.map((step) => (
            <article className="panel onboarding-step-card" key={step.number}>
              <div className="onboarding-step-topline">
                <span className="onboarding-step-number">{step.number}</span>
                <FontAwesomeIcon icon={step.icon} />
              </div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              <Link to={step.link} className="action-link">
                <span>{step.action}</span>
                <FontAwesomeIcon icon="arrow-up-right-from-square" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="onboarding-section" aria-labelledby="areas-heading">
        <div className="onboarding-section-heading">
          <div>
            <span className="onboarding-eyebrow">What each section is for</span>
            <h2 id="areas-heading">Choose where you want to work</h2>
          </div>
        </div>

        <div className="onboarding-area-list">
          {PRODUCT_AREAS.map((area) => (
            <Link to={area.link} className="onboarding-area-row" key={area.title}>
              <span className="onboarding-area-icon"><FontAwesomeIcon icon={area.icon} /></span>
              <span className="onboarding-area-copy">
                <strong>{area.title}</strong>
                <span>{area.description}</span>
              </span>
              <FontAwesomeIcon icon="arrow-up-right-from-square" />
            </Link>
          ))}
        </div>
      </section>

      <section className="panel onboarding-help-callout">
        <FontAwesomeIcon icon="circle-info" />
        <div>
          <h2>The simplest useful workflow</h2>
          <p>Import one agent’s last seven days of calls, then open the Needs attention view and review the lowest-scoring call first.</p>
        </div>
        <Link to="/imports/new" className="action-link">Start with a 7-day import</Link>
      </section>
    </section>
  )
}
