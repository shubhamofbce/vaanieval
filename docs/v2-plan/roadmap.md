# Roadmap

This roadmap turns the V2 plan into a practical sequence.

The goal is to get to a useful production evaluator quickly, without overbuilding too early.

## Phase 0 — Plan and model

Goal:

- align on product direction
- define data model
- define scoring model

Deliverables:

- V2 planning docs
- normalized entity design
- initial scoring taxonomy
- webhook ingestion design

## Phase 1 — ElevenLabs ingestion foundation

Goal:

- ingest real production conversations from ElevenLabs

Current implementation decision:

- playback uses provider-hosted audio URL/stream first
- app-managed object storage is deferred to a later phase

Scope:

- connect ElevenLabs account/API key
- sync conversation history
- fetch conversation details
- receive post-call transcription webhook
- receive post-call audio webhook
- store normalized transcript, metadata, and audio

Success criteria:

- user can connect an ElevenLabs agent
- user can import historical conversations
- new calls appear automatically
- audio can be stored when available

## Phase 2 — Review experience

Goal:

- make conversations easy to inspect

Scope:

- conversation list view
- transcript viewer
- call detail page
- audio replay at 1x and 2x
- filters by agent, date, language, status, and outcome

Success criteria:

- reviewers can quickly inspect failed or interesting calls
- playback works cleanly
- transcript and metadata are readable

## Phase 3 — Core production scoring

Goal:

- provide a useful scorecard for real production use

Scope:

- business outcome scoring
- task execution scoring
- reliability scoring
- compliance and hallucination checks
- conversation quality scoring
- voice naturalness scoring where audio exists

Success criteria:

- each conversation has a clean score breakdown
- scores include rationale and evidence
- users can sort and filter by score outcomes

## Phase 4 — Analytics and trends

Goal:

- help teams understand performance over time

Scope:

- score trends by day/week/month
- outcome breakdown by agent and version
- latency and failure trends
- cost per successful outcome
- score breakdown by language, workflow, or call source

Success criteria:

- teams can compare performance over time
- teams can spot regressions and bottlenecks

## Phase 5 — Domain-specific packs

Goal:

- make the evaluator useful for real business workflows

Scope:

- appointment booking rubric pack
- sales / property qualification rubric pack
- customer support rubric pack
- configurable field extraction and expected outcomes

Success criteria:

- users can choose a template close to their use case
- scores become more business-specific and actionable

## Phase 6 — Extensibility and expansion

Goal:

- prepare the platform for broader adoption

Scope:

- provider adapter abstraction
- additional provider ingestion later
- human QA workflows
- reviewer annotations
- calibration against human review
- synthetic evals as a secondary mode

Success criteria:

- internal architecture is no longer tightly coupled to ElevenLabs
- score engine can be reused across providers

## Recommended launch slice

If we want a strong but realistic first V2 release, build this first:

### Launch slice

- ElevenLabs historical sync
- ElevenLabs post-call transcription webhook ingestion
- ElevenLabs post-call audio webhook ingestion
- conversation review page
- 1x and 2x audio playback
- core scorecard
- filters and trend basics

This is the smallest version that still feels like a real production eval product.

## Open questions for next iteration

- how should multi-tenant workspace permissions work?
- when should we switch from provider-hosted media to app-managed object storage by default?
- how should we handle missing audio but available transcripts?
- should human reviewer overrides change official scores or stay separate?
- how should domain-specific packs be versioned?