# Score Taxonomy

This file defines the score model recommended for production voice-agent evaluation.

The goal is to make the scorecard useful for real operators, not just technically interesting.

## Design principle

Avoid a single opaque score.

Instead, use:

- a small set of top-level score groups
- a few high-value metrics inside each group
- evidence and rationale for each score

## Top-level score groups

V2 should organize production evaluation into these 6 groups:

1. Business Outcome
2. Task Execution
3. Conversation Quality
4. Reliability
5. Compliance and Safety
6. Voice Experience

## 1. Business Outcome

This is the most important group.

These scores answer whether the agent created value.

| Score | What it means | Why it matters | Suggested source |
| --- | --- | --- | --- |
| Task Completion Score | Did the agent complete the goal? | Core business success metric | Transcript + tool results + LLM judge |
| Resolution Score | Was the user issue resolved in-call? | Important for support and service use cases | Transcript + LLM judge |
| Conversion Score | Did the call move the user to the target outcome? | Important for sales and booking | Transcript + extracted outcome + LLM judge |
| Containment Score | Was the issue handled without transfer/escalation? | Measures AI self-sufficiency | Metadata + workflow/tool events |
| Successful Outcome Rate | Percentage of calls that reached success | Core dashboard metric | Aggregated scoring |
| Cost per Successful Outcome | Spend required per good result | Critical for production economics | Provider cost + outcome label |

### Launch priority

**Must-have**

## 2. Task Execution

These scores answer whether the agent did the job correctly.

| Score | What it means | Why it matters | Suggested source |
| --- | --- | --- | --- |
| Intent Understanding Score | Did the agent correctly understand user intent? | Misunderstood intent causes hidden failures | Transcript + LLM judge |
| Required Info Capture Score | Did the agent collect the necessary fields? | Essential for booking, qualification, support | Data extraction + deterministic checks |
| Procedure Adherence Score | Did the agent follow the expected flow? | Important for repeatability and QA | Transcript + workflow + rubric |
| Tool Use Effectiveness Score | Did the agent call the right tools and use outputs correctly? | Many production failures happen here | Tool call logs + transcript |
| Escalation Correctness Score | Did the agent escalate when it should? | Avoids both under-escalation and over-escalation | Transcript + workflow metadata |
| Next-Step Accuracy Score | Did the agent end with the right next action? | Important for user trust and operational success | Transcript + LLM judge |

### Launch priority

**Must-have**

## 3. Conversation Quality

These scores answer whether the call felt smooth and helpful.

| Score | What it means | Why it matters | Suggested source |
| --- | --- | --- | --- |
| Conversation Quality Score | Overall helpfulness, coherence, and clarity | Strong overall UX signal | LLM judge |
| Clarification Quality Score | How well the agent recovered from ambiguity | Important for real-world robustness | Transcript + LLM judge |
| Repetition Score | How often the agent repeated itself | Strong predictor of frustration | Transcript heuristics + LLM judge |
| Frustration Risk Score | Whether the user seemed confused or annoyed | High value for QA review | Transcript + sentiment-like rubric |
| Customer Effort Proxy | How hard the user had to work | Good measure of friction | Transcript + turn count + repetition |
| Tone and Empathy Score | Whether tone matched the use case | Important in support and service settings | Transcript + audio + LLM judge |

### Launch priority

**High**

## 4. Reliability

These scores answer whether the system is stable enough for production.

| Score | What it means | Why it matters | Suggested source |
| --- | --- | --- | --- |
| Latency Score | How responsive the agent was | Directly impacts perceived quality | Provider timing metrics |
| Error Rate | Fraction of calls with failures | Core operational health metric | Provider metadata |
| Tool Failure Rate | How often tool calls failed | Major production pain point | Tool logs |
| Recovery Score | How well the agent handled failures | Reliability is more than no-failure | Transcript + tool logs |
| Call Initiation Failure Rate | How often calls fail before starting | Important in telephony workflows | Provider webhook / metadata |
| Workflow Bottleneck Score | Where calls get stuck or terminate | Useful for workflow debugging | Workflow analytics |

### Launch priority

**Must-have**

## 5. Compliance and Safety

These scores answer whether the agent stayed inside acceptable boundaries.

| Score | What it means | Why it matters | Suggested source |
| --- | --- | --- | --- |
| Compliance Adherence Score | Did the agent follow required rules or script obligations? | Required for enterprise and regulated use cases | Transcript + rubric + LLM judge |
| Disclosure Compliance Score | Did the agent disclose AI identity when required? | Important in regulated or policy-bound cases | Transcript + deterministic checks |
| Consent Capture Score | Did it collect or confirm required consent? | Important for healthcare, finance, booking, sales | Transcript + extracted fields |
| Hallucination Risk Score | Did it make unsupported claims? | Major trust and safety metric | Transcript + policy/rag checks + LLM judge |
| Unsafe Advice Risk Score | Did it say something risky or harmful? | Critical in regulated domains | Transcript + policy model |
| Sensitive Data Handling Score | Did it mishandle or overexpose sensitive info? | Important for privacy and audit | Transcript + redaction checks |

### Launch priority

**Must-have** in enterprise or regulated domains

## 6. Voice Experience

These scores answer how the agent sounded, not just what it said.

| Score | What it means | Why it matters | Suggested source |
| --- | --- | --- | --- |
| Voice Naturalness Score | Did the agent sound human-like and smooth? | Important for adoption and brand quality | Audio review + LLM/audio judge |
| Speech Clarity Score | Was the speech understandable and clear? | Core usability metric | Audio review |
| Pacing Score | Was speed and rhythm appropriate? | Impacts comfort and comprehension | Audio review + heuristics |
| AI Detectability Score | Would users likely identify it as AI? | Useful for UX testing, though context-dependent | Audio + transcript judge |
| Perceived Responsiveness Score | Did delays feel awkward? | Better than latency alone for UX | Audio + timing data |
| Interruption Handling Score | How well did the agent handle cutoffs and turn-taking? | Very important in voice experiences | Transcript + timing + audio |

### Important note

Do not treat `AI Detectability` as universally bad.

In some products, sounding less robotic is the goal.
In others, clear AI disclosure is required.

So V2 should separate:

- **Human-Likeness / Naturalness**
- **AI Disclosure Compliance**
- **AI Detectability**

### Launch priority

**Medium to high**

## Recommended launch scorecard

For the first production-ready version, focus on this smaller set.

### Core launch scores

- Task Completion Score
- Intent Understanding Score
- Required Info Capture Score
- Tool Use Effectiveness Score
- Containment Score
- Latency Score
- Error Rate
- Compliance Adherence Score
- Hallucination Risk Score
- Conversation Quality Score
- Voice Naturalness Score
- Cost per Successful Outcome

## Weighted score model for launch

Use a weighted score model rather than a pure average.

### Suggested top-level weights

| Score group | Suggested weight |
| --- | ---: |
| Business Outcome | 30% |
| Task Execution | 25% |
| Reliability | 15% |
| Compliance and Safety | 15% |
| Conversation Quality | 10% |
| Voice Experience | 5% |

### Why this weighting

- outcome and task correctness matter most
- reliability and safety are mandatory for production
- conversation and voice quality still matter, but they should not outweigh outcome

These weights should be configurable by use case.

## Use-case-specific weighting

Different voice-agent types need different weights.

### Appointment booking

Higher weight on:

- task completion
- information capture
- next-step accuracy
- latency

### Sales / property qualification

Higher weight on:

- conversion
- qualification completeness
- objection handling
- conversation quality

### Customer support

Higher weight on:

- resolution
- containment
- compliance
- frustration risk

### Regulated or healthcare use cases

Higher weight on:

- compliance
- consent capture
- unsafe advice risk
- escalation correctness

## Scoring evidence rules

Every score should include some explanation.

At minimum, store:

- score value
- short rationale
- evidence source
- transcript snippet or turn references when possible

For audio-related scores, attach:

- audio timestamp range
- reviewer playback reference when possible

## Review UI recommendation

The UI should show:

- top-level score groups first
- expandable sub-scores
- evidence snippets
- audio replay when available
- filters by score, failure mode, use case, agent, and version

## What not to do

- do not show one mysterious overall number without breakdown
- do not over-index on voice quality while ignoring business outcome
- do not rely on transcript-only for all voice judgments when audio exists
- do not make every score mandatory for every use case