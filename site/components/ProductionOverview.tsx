const waveform = [42, 68, 31, 82, 54, 76, 38, 63, 91, 57, 34, 72, 48, 86, 61, 39, 77, 53, 88, 46, 69, 33, 74, 58]

const scorecards = [
  { label: 'Task completion', value: '28', tone: 'risk' },
  { label: 'Intent understanding', value: '91', tone: 'good' },
  { label: 'Information capture', value: '44', tone: 'warn' },
]

export function ProductionOverview() {
  return <figure className="production-overview" aria-label="Illustrative VaaniEval workflow showing production quality metrics, a failed call, audio review, evaluation evidence, and a recommended next step.">
    <div className="po-toolbar">
      <div><i aria-hidden="true" /><span>Production QA</span></div>
      <span className="po-range">Last 7 days</span>
    </div>

    <div className="po-kpis" aria-label="Illustrative fleet metrics">
      <div><small>QA pass rate</small><strong>82%</strong><span className="po-down">-4.2%</span></div>
      <div><small>Calls evaluated</small><strong>1,248</strong><span>94% coverage</span></div>
      <div><small>Needs attention</small><strong>37</strong><span className="po-risk">Review queue</span></div>
    </div>

    <div className="po-workspace">
      <div className="po-call-list">
        <div className="po-list-head"><span>Priority calls</span><b>37</b></div>
        <article className="active">
          <span className="po-severity">High risk</span>
          <strong>Scheduling fallback failed</strong>
          <small>Dental booking agent · 2m 14s</small>
        </article>
        <article>
          <span>Needs review</span>
          <strong>Required details missing</strong>
          <small>Claims agent · 3m 02s</small>
        </article>
        <article>
          <span>Needs review</span>
          <strong>Provider outcome unknown</strong>
          <small>Support agent · 1m 37s</small>
        </article>
      </div>

      <div className="po-investigation">
        <div className="po-call-head">
          <div><small>Call review</small><strong>Scheduling fallback failed</strong></div>
          <span>Score 54</span>
        </div>
        <div className="po-wave" aria-hidden="true">
          <button type="button" tabIndex={-1}>▶</button>
          <div>{waveform.map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div>
          <span>01:18 / 02:14</span>
        </div>
        <div className="po-transcript">
          <p><b>Caller</b><span>I need to move my cleaning to Tuesday morning.</span></p>
          <p><b>Agent</b><span>I cannot access scheduling. Please call us again later.</span></p>
        </div>
        <div className="po-scores">
          {scorecards.map(score => <div key={score.label} className={score.tone}>
            <span>{score.label}</span><strong>{score.value}</strong>
          </div>)}
        </div>
        <div className="po-root-cause">
          <span>Likely next fix</span>
          <p>The outage branch did not preserve the existing appointment or create a staff handoff.</p>
          <b>Replay this failure after the workflow change →</b>
        </div>
      </div>
    </div>
    <figcaption>Illustrative product workflow using synthetic data, not a customer result.</figcaption>
  </figure>
}
