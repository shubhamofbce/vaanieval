# South Park Commons Founder Fellowship application plan — VaaniEval

**Target cohort:** Fall 2026 Founder Fellowship

**Application deadline:** Sunday, August 2, 2026, 11:59pm Pacific Time (Monday, August 3, 2026, 12:29pm IST)

**Program logistics if accepted:** late September through late November; the eight-week bootcamp is in person at an SPC location (San Francisco, New York City, or Bangalore).

## 1. Recommendation and positioning

Apply to the **Founder Fellowship**, not the Member Residency. VaaniEval is already a functioning product with a coherent technical thesis, and the current intent is to build a venture-scale company rather than take an open-ended exploratory break. SPC says the Fellowship is for founders with an early team and a high-conviction north star who are ready for funding; it does not require traction or even a fully fixed idea.

The application should not frame VaaniEval as another generic analytics dashboard or an LLM wrapper. It should frame the company around a sharper conviction:

> Voice agents are becoming the operational interface for businesses, but teams lack a trustworthy quality-control loop for real conversations. Existing voice platforms show call activity; VaaniEval makes outcome quality inspectable, calibratable, and actionable.

The initial wedge is an open-source, self-hostable evaluation workspace for teams operating production voice agents, initially those using ElevenLabs, Vapi, and Bolna. The longer-term thesis is a quality and release-control layer for agentic voice systems: evaluate every important workflow against an organization's own definition of success, trace a metric to the underlying evidence, detect regressions after changes, and help teams safely ship better agents.

This is an intentionally ambitious framing. The current repository supports the workflow and integrations; it does **not** establish market size, model accuracy, customer retention, or adoption. State those as hypotheses to validate, never as established facts.

## 2. What SPC is selecting for

SPC explicitly emphasizes frontier ambition, an applicant's ability to generate ideas, technical approaches, relevant research or markets, ideas considered and discarded, and a readiness to participate fully in its in-person community. For a solo founder, SPC has a stated bias toward people who can build and prototype.

The strongest evidence VaaniEval can provide today is:

| Application signal | Repository-backed proof | What still needs founder input |
| --- | --- | --- |
| Can build | Full-stack FastAPI, worker, React app, public Next.js site, database migrations, tests, and development/deployment documentation. | Personal technical history and examples of speed/resourcefulness. |
| Has a specific problem insight | Production voice calls need outcome-level review, not just volume and duration; evaluation should preserve transcript/audio/rationale evidence. | The observations or conversations that made this problem urgent. |
| Has a credible initial wedge | Imports/adapters for ElevenLabs, Vapi, and Bolna; evaluator-backed scorecards; workspace-scoped credentials; queue-backed jobs; dashboards and agent drilldowns. | Which user segment is most painful and why it will adopt first. |
| Can learn rather than overclaim | The site states that human calibration is necessary before operational gating and that self-hosting does not remove external provider data flows. | A concrete list of assumptions already disproved or changed. |
| Is venture-scale | Quality infrastructure can become essential as voice-agent deployments and regulated/high-stakes uses grow. | A believable expansion path and why the founder is uniquely positioned to pursue it. |

## 3. Application narrative: first draft inputs

Use concise, direct answers. Each answer should have one claim, one concrete example, and one implication. Avoid buzzwords such as “revolutionary,” “seamless,” or “AI-powered.”

### One-sentence company description

> VaaniEval is an open-source, self-hostable quality-control workspace for production voice agents: it imports real calls, evaluates task-critical behavior, and connects every score to the transcript, available audio, and rationale needed to improve an agent safely.

### Problem and insight

> Voice-agent teams can see operational activity—calls, durations, completion events—but those signals do not tell them whether the caller got the right outcome. Manual call review does not scale, while opaque LLM scores are hard to trust or act on. The missing system is an evaluation loop that starts with real production conversations, measures workflow-specific behavior, keeps the evidence visible, and verifies the next calls after a change.

Keep the final version tied to the founder's actual firsthand observation. If the original insight came from building voice agents, supporting customers, reviewing calls, or observing a specific workflow, replace the general opening with that story.

### Why now

> Voice agents can now be prototyped and deployed quickly, increasing the cost of discovering quality failures only after they reach customers. At the same time, teams can use evaluator models to review calls at scale, but that only becomes operationally useful when the scores are calibrated against real workflows and traceable to evidence. The enabling models exist; the quality-control layer is still immature.

This is a market hypothesis, not a claim that no competitors exist. Be prepared to name the alternatives: voice-platform dashboards, manual QA, generic LLM observability/evaluation tools, and internal scripts.

### What exists now

> The repository contains a working full-stack product: provider-based imports for ElevenLabs, Vapi, and Bolna; normalized conversations with transcript and available media; evaluator-backed metrics and rationales; agent and quality dashboards; encrypted stored credentials; workspace-scoped data; and queue-backed import/evaluation jobs. It is AGPL-3.0 open source and can be self-hosted.

Only claim a hosted experience, public deployment, or customer use when the founder can personally verify it at submission time.

### Long-term thesis

> The company can become the release and quality system for voice agents: a team encodes the behaviors that matter for each workflow, monitors them continuously, investigates failures with evidence, and proves whether a change improved production outcomes. The first product is a review workspace; the durable product is the system of record for whether an agent is safe and effective enough to operate.

### Why SPC

> I am applying because the highest-risk work is not only shipping more code. It is finding the highest-leverage market and workflow, pressure-testing the evaluation thesis with technically demanding peers, and turning early product signals into a company worth building for a decade. I would contribute hands-on experience building voice-agent evaluation infrastructure while using the community to sharpen customer discovery, the company narrative, technical direction, and potential co-founder or early-team decisions.

Make this personal before submitting: identify 2–3 specific things the founder wants to learn, build, or contribute in Bangalore, and explain the full-time commitment.

## 4. Required application packet

Complete this packet before opening the form. It prevents the form from becoming the first draft of the company narrative.

| Asset | Owner | Ready-by | Acceptance test |
| --- | --- | --- | --- |
| Founder fact sheet | Founder | Jul 27 | Current location, employment/commitment status, education, work history, personal links, visa/relocation constraints, and co-founder status are accurate. |
| Product fact sheet | Founder + engineering | Jul 27 | One-page list of what works, what is prototype-only, deployment status, integrations, security boundaries, license, and demo URL. |
| Product demo | Founder | Jul 29 | A 90–120 second screen recording: connect/import → inspect call evidence → run/view evaluation → identify an issue. No customer data or credentials. |
| Problem evidence log | Founder | Jul 29 | 10 dated observations: interviews, public job posts, forum threads, product teardowns, or hands-on experiments. Separate facts from interpretation. |
| User/market map | Founder | Jul 30 | 3 candidate segments, user, painful job, present workaround, buying trigger, data/access constraints, and next validation test. |
| Competitive map | Founder | Jul 30 | Alternatives grouped by voice-platform dashboard, manual QA/BPO, generic eval/observability, and internal tooling; VaaniEval's real differentiation and gaps. |
| Founder video or intro, if requested | Founder | Jul 31 | 60–90 seconds, direct and unedited: who you are, why this problem, what you built, and what you are testing next. |
| Application answer bank | Founder | Jul 31 | Final answers copied into a single document, fact checked, with short and long variants. |
| Reference/contact list, if requested | Founder | Jul 31 | People who can truthfully speak to technical ability, founder behavior, or relevant domain knowledge; permission requested before sharing. |

Do not create a pitch deck unless the application asks for one. A short demo and exact answers are more useful at this stage. A deck can encourage polished but weak claims.

## 5. Seven-day execution plan

### Day 1 — July 26: decide the application stance

- Confirm the applicant entity: solo founder or founding team. If there is a co-founder, apply as one funding team and make the relationship explicit.
- Confirm ability to attend in person in Bangalore for the bootcamp and to work on the company full time. SPC says active members are expected to work from an SPC hub throughout the week.
- Write the founder fact sheet and a timeline of the path to VaaniEval.
- Record an unpolished 3-minute verbal answer to: “What did you see that made you build this?” Use it to find the genuine story.

### Day 2 — July 27: establish the evidence boundary

- Turn the product fact sheet into a claim ledger: each application statement must link to code, a deployable demo, an approved public source, or the founder's firsthand experience.
- List every metric currently available. Unless independently verifiable, label it **internal**, **preliminary**, or omit it.
- Use a clean, synthetic or anonymized demo dataset. Do not include call recordings, transcripts, secrets, customer names, or user identifiers in application material.
- Identify current product gaps candidly: the public site describes a focused initial scorecard and design-partner roadmap for custom criteria; the architecture notes that evaluation data may still flow to configured providers.

### Day 3 — July 28: sharpen the market thesis

- Pick one initial segment to lead with: for example, agencies operating multiple client voice agents, or teams running customer-facing voice workflows. Pick only the segment supported by actual founder evidence.
- Conduct 3–5 problem conversations. Ask about the last bad production call, review volume, current process, cost of failure, how changes are approved, and what data cannot leave their environment. Do not pitch until the end.
- Make a one-page market map. Mark every conclusion as observed, inferred, or untested.

### Day 4 — July 29: create proof of building

- Produce the clean product demo.
- Run the repo's relevant checks and repair only true blockers to the demo path. For the public site, the required verification command is `npm --prefix site run build`; for the product app, `npm --prefix frontend run build`.
- Do not start large new features. The purpose is credible evidence of speed and product judgment, not a last-minute feature race.

### Day 5 — July 30: draft answers and future map

- Write application responses in a plain-text answer bank. Use the narrative in section 3 as a factual starting point, then replace placeholders with personal evidence.
- Write a 12-month hypothesis map: initial buyer, must-prove behavior, product milestone, evidence required, and kill/iterate condition. Do not publish revenue or adoption forecasts without a defensible model.
- Draft the “why venture-scale” answer as a wedge-to-platform sequence: workflow QA → team-wide quality system → release controls and regression monitoring → broader agent reliability infrastructure.

### Day 6 — July 31: red-team the application

- Have two people who know the founder read the application: one technical, one non-technical. Ask them to underline statements they cannot verify and summarize the company back in one sentence.
- Rehearse 6-minute interview answers: founder background, problem origin, product walkthrough, initial user, alternatives, and why now.
- Check every link, including GitHub, demo, calendar, and live site. Keep the repository presentable; do not make cosmetic churn merely for the application.

### Day 7 — August 1–2 PT: submit with buffer

- Submit by **August 1 PT**, not the final hour. Re-open the confirmation and save a copy of all submitted answers.
- Prepare a 1-page follow-up brief for an interview: company one-liner, three product screenshots, product/demo link, current learning, questions for SPC, and logistics.
- If interviews are offered, expect a short conversation focused on founder background, technical ability, conviction, alternatives, and the next learning loop—not a polished enterprise sales pitch.

## 6. Product plan that strengthens the application without distorting it

The product work should demonstrate a learning loop. The recommended sequence is deliberately narrow.

| Horizon | Objective | Deliverable | Evidence of progress | Tradeoff / guardrail |
| --- | --- | --- | --- | --- |
| Before submission | Make the core loop demoable and trustworthy | Synthetic workspace demonstrating import, evidence review, evaluation rationale, and dashboard-to-call drilldown | Repeatable 2-minute demo; relevant builds pass | No customer data; avoid new integrations and major architecture changes. |
| Weeks 1–4 | Validate one buyer/workflow | 10 problem interviews; 3 design-partner candidates; one written workflow rubric | Signed pilot intent or explicit rejection reasons | Conversation volume is not validation; protect call-data privacy and never promise compliance. |
| Weeks 5–8 | Prove evaluation usefulness | Workflow-specific rubric configuration and a human-calibration process for a small representative call set | Agreement between reviewers/evaluator sufficient for the selected use case, with errors categorized | Model scores should prioritize review, not autonomously block high-impact calls. Calibration has ongoing operating cost. |
| Months 3–4 | Make evaluation operational | Regression view/alerts and a before-versus-after change workflow | A partner can identify an issue, change an agent, and evaluate subsequent calls | Alerting creates noise and reliability obligations; require minimum samples and configurable thresholds. |
| Months 5–6 | Decide the business model | Packaging test: self-hosted/open-core support, hosted control plane, or managed evaluation service | At least three buyer conversations that compare willingness to pay, data constraints, and procurement friction | AGPL can increase trust and adoption but complicates managed-hosting and enterprise sales; get legal advice before changing licensing or data terms. |

Current architectural choices support this plan: provider-specific adapters isolate integration behavior; the database-backed queue handles retryable work; credentials are encrypted before storage; and workspace scoping is already part of the security boundary. Scaling risks should be explicit in the application and product plan:

- **Cost:** evaluator inference and audio/transcript storage can rise with call volume. Add sampling, batching, model routing, and per-workspace budgets before promising full-call coverage.
- **Reliability:** provider APIs, queues, and evaluator availability can delay or duplicate work. Preserve idempotency, job visibility, retry limits, and a clear failed/unknown state.
- **Privacy/security:** conversational data may contain sensitive information. Self-hosting gives deployment control but does not remove flows to voice/evaluator providers. Access controls, retention, deletion, auditability, and redaction become more important as usage grows.
- **Evaluation quality:** fixed generic metrics fail across workflows. Custom rubrics and human calibration increase utility but require product design, versioning, and monitoring against evaluator drift.
- **Go-to-market:** the agency wedge may accelerate learning but can create fragmented requirements and long support tails. Keep a strict ideal-customer profile and reject bespoke integrations that do not repeat.

## 7. Likely interview questions and answer structure

These are preparation prompts, not confirmed form questions.

1. **Why are you the person to build this?** Start with personal evidence, then technical execution, then the unique insight. Do not use a generic “I am passionate about AI” answer.
2. **Why do voice teams need this rather than their platform dashboard?** Explain the difference between activity metrics and outcome quality; show a call-level evidence workflow.
3. **What do you know that others do not?** Use an observed pattern, not an untested assertion. State what you are still trying to learn.
4. **Who uses it first and what do they replace?** Name one role, one workflow, the current manual/fragmented process, and a measurable decision it improves.
5. **How is this different from generic evaluation or observability tools?** Be fair: they may be alternatives or complements. VaaniEval's current differentiation is production voice-conversation ingestion, evidence-linked QA, and self-hosted deployment control—not a claim of universal superiority.
6. **What would you do with the first $400k?** Tie spend to 12 months of learning: founder runway, a small number of high-leverage technical/product hires or contractors only after evidence, evaluation/infra budgets, and deliberate design-partner work. Do not present a headcount plan as if it is already funded.
7. **What would falsify the idea?** Name a real kill condition, e.g. target teams will not grant safe access to conversation data, workflow rubrics cannot reach useful reviewer agreement, or buyers will not prioritize quality over existing dashboards.
8. **Why SPC and why now?** Be specific about in-person Bangalore participation, direct partner feedback, technical peer pressure-testing, customer discovery, and the desired next milestone.

## 8. Submission checklist

- [ ] Founder/teams facts are complete and true.
- [ ] The application clearly selects the funding path and explains the full-time, in-person commitment.
- [ ] The one-sentence description states user, problem, product, and benefit without unsupported traction claims.
- [ ] Every claim is tagged as firsthand, code/demo backed, externally sourced, or hypothesis.
- [ ] Demo contains only synthetic, anonymized, or approved material.
- [ ] Links work in an incognito browser.
- [ ] No secrets, customer names, customer conversations, personal data, or unapproved quotes appear anywhere.
- [ ] The funding terms are understood: $400k for 7% via SAFE plus $600k guaranteed in the next external round. Obtain independent legal and financial advice before signing anything.
- [ ] Submission is completed by August 1 PT; confirmation and answer copy are saved.

## Sources

- [SPC Founder Fellowship Fall 2026](https://www.southparkcommons.com/news/f26-founder-fellowship) — deadline, format, funding, location, selection emphasis.
- [SPC FAQ](https://www.southparkcommons.com/faq/) — Fellowship versus Residency, application process, co-founder guidance, full-time/in-person expectations, funding structure.
- [VaaniEval README](../README.md), [architecture](architecture.md), [public site](../site/app/page.tsx), and [design-partner page](../site/app/design-partners/page.tsx) — current product and claim boundaries.
