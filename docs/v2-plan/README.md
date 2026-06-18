# V2 Plan

This folder contains the V2 planning docs for turning VaaniEval into a production-ready evaluation product for voice agents.

The plan is intentionally split into a few small files so it stays easy to read and update.

## Files

- [Overview](README.md)
- [Score Taxonomy](score-taxonomy.md)
- [Roadmap](roadmap.md)

## V2 Direction

V2 should start as an **ElevenLabs-first production evaluation platform** built on real conversation data.

Instead of starting with synthetic-only evals, the product should ingest:

- historical conversations from ElevenLabs
- post-call transcription webhooks
- post-call audio webhooks

This gives us a much stronger product foundation because users can evaluate how their agents actually perform in production.

## Main product goal

Help teams answer:

- Is the voice agent actually successful in production?
- Is it completing the business task?
- Is it creating a good user experience?
- Is it safe and compliant?
- Is it reliable and cost-effective?

## Recommended V2 scope

### Phase 1 product shape

Users should be able to:

1. Connect their ElevenLabs account or API key
2. Select one or more agents
3. Import past conversations
4. Receive ongoing conversations via webhook ingestion
5. Store transcript, metadata, and audio
6. Replay audio in the review UI at 1x and 2x
7. Score conversations using production-focused rubrics
8. Review trends, failures, and top issues

## Architecture direction

### 1. Provider connection layer

Responsibilities:

- connect to ElevenLabs securely
- validate credentials
- discover agents
- manage sync settings

This layer should be provider-specific, but the rest of the system should depend on normalized internal models.

### 2. Ingestion layer

Two ingestion paths:

- **Historical sync** using ElevenLabs conversation APIs
- **Realtime ingestion** using post-call webhooks

Recommended ingestion sources:

- `GET /v1/convai/conversations`
- `GET /v1/convai/conversations/{conversation_id}`
- `POST /v1/convai/conversations/{conversation_id}/analysis/run`
- `post_call_transcription` webhook
- `post_call_audio` webhook

### 3. Normalized conversation store

Store provider-independent data such as:

- conversation
- transcript turns
- tool calls and tool results
- conversation metadata
- native provider analysis
- audio artifacts
- evaluation outputs

This is the key to making V2 extensible to other voice-agent providers later.

### 4. Audio pipeline

Audio is critical for review and product trust.

V2 should store:

- full conversation audio when available
- audio metadata like duration and format
- optional derived waveform data later

The UI should support:

- play / pause
- seek
- 1x playback
- 2x playback

Important note:

- audio availability depends on ElevenLabs audio retention and audio saving settings
- if audio is not available, the system should still support transcript-only evaluation

### 5. Evaluation engine

The evaluation engine should combine:

- deterministic scoring
- LLM-based judging
- provider-native analysis

The engine should be built around production score groups rather than one generic pass/fail number.

See [Score Taxonomy](score-taxonomy.md) for the recommended model.

### 6. Review and analytics UI

The review experience should make it easy to:

- inspect conversation outcomes
- replay audio
- read transcripts
- see scoring evidence
- filter by business outcome, errors, language, workflow, or agent version

## Product principles

### Outcome first

The most important question is whether the agent succeeded at the real business task.

### Evidence over magic

Every score should be backed by:

- transcript evidence
- audio evidence where relevant
- metadata and tool evidence
- a short rationale

### Small, composable scorecards

Do not rely on one giant score. Use a clear score breakdown that operators can act on.

### Provider-agnostic core

Even though V2 starts with ElevenLabs, internal models should be designed so new providers can be added later.

## Future extension path

After ElevenLabs-first V2 is stable, the same architecture can support:

- other voice-agent providers
- browser-native live evaluation
- telephony-first evaluation
- synthetic eval agents
- human reviewer workflows
- calibration against human QA

## Suggested next iteration topics

The next planning iterations should define:

- normalized data model
- webhook ingestion flow
- reviewer UI flow
- scoring job pipeline
- multi-tenant workspace model
- permissions and audit trail