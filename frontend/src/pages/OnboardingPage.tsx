import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'

export function OnboardingPage() {
  return (
    <section className="page onboarding-page">
      <PageHeader
        icon="sliders"
        title="Evaluation Command Center"
        subtitle="Run imports, validate call quality, and move from raw conversations to clear QA outcomes."
      />

      <section className="stats-grid">
        <StatCard icon="plug" label="Provider" value="ElevenLabs" />
        <StatCard icon="users" label="Agent discovery" value="Ready" tone="good" />
        <StatCard icon="file-import" label="Imports" value="Continuous" />
        <StatCard icon="chart-line" label="Quality review" value="In progress" tone="warn" />
      </section>

      <section className="grid onboarding-actions-grid">
        <article className="panel onboarding-action-card">
          <div className="onboarding-action-head">
            <span className="provider-icon"><FontAwesomeIcon icon="plug" /></span>
            <h2>Connect provider</h2>
          </div>
          <p>Add your ElevenLabs API key and validate workspace access in one step.</p>
          <Link to="/settings/provider" className="action-link">
            <FontAwesomeIcon icon="link" />
            <span>Open provider settings</span>
          </Link>
        </article>

        <article className="panel onboarding-action-card">
          <div className="onboarding-action-head">
            <span className="provider-icon"><FontAwesomeIcon icon="headset" /></span>
            <h2>Discover agents</h2>
          </div>
          <p>Sync and manage your voice agents, then route directly into filtered conversations.</p>
          <Link to="/settings/agents" className="action-link">
            <FontAwesomeIcon icon="users" />
            <span>Manage agents</span>
          </Link>
        </article>

        <article className="panel onboarding-action-card">
          <div className="onboarding-action-head">
            <span className="provider-icon"><FontAwesomeIcon icon="download" /></span>
            <h2>Import historical calls</h2>
          </div>
          <p>Create import jobs for date ranges or single agents and track queue progress live.</p>
          <Link to="/imports/new" className="action-link">
            <FontAwesomeIcon icon="file-import" />
            <span>Start import</span>
          </Link>
        </article>

        <article className="panel onboarding-action-card">
          <div className="onboarding-action-head">
            <span className="provider-icon"><FontAwesomeIcon icon="wave-square" /></span>
            <h2>Review conversations</h2>
          </div>
          <p>Inspect transcripts, audio timeline, quality signals, and warnings in one workspace.</p>
          <Link to="/conversations" className="action-link">
            <FontAwesomeIcon icon="comments" />
            <span>Open conversations</span>
          </Link>
        </article>
      </section>

      <section className="panel onboarding-next-step">
        <h2>Next best action</h2>
        <p className="muted">Start by confirming provider connection health, then run a focused import for one agent to validate end-to-end quality signals.</p>
        <div className="inline">
          <Link to="/settings/provider" className="action-link">
            <FontAwesomeIcon icon="shield" />
            <span>Check provider health</span>
          </Link>
          <Link to="/imports/new" className="action-link">
            <FontAwesomeIcon icon="clock" />
            <span>Run a quick import</span>
          </Link>
        </div>
      </section>
    </section>
  )
}
