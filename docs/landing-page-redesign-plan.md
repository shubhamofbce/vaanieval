# VaaniEval homepage repositioning and visual refresh

## Goal

Reposition the homepage around three messages, in this order:

1. VaaniEval is open source and can run in infrastructure the customer controls.
2. Voice-platform dashboards do not show whether an agent actually performed well; VaaniEval evaluates real production conversations with evidence.
3. VaaniEval is an open-source project worth adopting and starring on GitHub.

The primary homepage conversion is a GitHub star. The design-partner application remains the secondary conversion.

## Positioning and claims

- Use **Open-source, self-hosted voice-agent evaluation** as the primary category statement.
- Lead with: **Know how your voice agents perform—on infrastructure you control.**
- Support the claim with real capabilities: production-call imports from ElevenLabs and Vapi, evaluator-backed scores, transcripts, available audio, rationales, and dashboard trends.
- Explain that platform metrics such as call volume, duration, and completed calls do not necessarily prove quality.
- Promote the current default scorecard: task completion, intent understanding, required-information capture, and agent delivery. Also describe supported evaluation themes such as resolution quality, fallback behavior, unsupported claims, and available operational signals where appropriate.
- Describe custom scorecards and automatic criteria discovery only as a clearly labelled **Design-partner roadmap** capability. Do not present it as available product functionality.
- Say customers can deploy in infrastructure they control and link to the documented deployment paths. Do not claim one-click or single-command production deployment until that exists.

## Homepage structure

### 1. Hero: self-hosted quality visibility

- Eyebrow: `Open-source • Self-hosted voice-agent evaluation`
- H1: `Know how your voice agents perform—on infrastructure you control.`
- Body: import real conversations, score the outcomes operational dashboards miss, and keep the evaluation workspace in the environment the team chooses.
- Primary CTA: GitHub-icon **Star on GitHub**, linking directly to the repository.
- Secondary CTA: **Apply as a design partner**.
- Supporting proof row: MIT licensed, self-hostable, ElevenLabs imports, and Vapi imports.
- Do not hard-code a GitHub star count; it will become stale. The action itself should send visitors to the live GitHub star control.

### 2. Visual: evaluation signal, not a generic product shot

Build a code-native abstract composition in HTML/CSS:

- A central quality scorecard with task completion, intent understanding, required-information capture, and agent delivery.
- Connected evidence chips for transcript, audio, and evaluator rationale.
- A visible contrast between platform metrics (`Call volume`, `Call duration`, `Completed calls`) and evaluation signals (`Did the task succeed?`, `Did the agent understand intent?`).
- Use no raster image in this hero.

### 3. Problem and solution

- Heading: **Your voice platform tells you what happened. VaaniEval tells you whether it worked.**
- Show a concise comparison between operational reporting and conversation-quality evaluation.
- Explain that every score leads back to a specific call and its evidence.
- Link to `/resources/evaluation-metrics`.

### 4. What VaaniEval scores

- Present the current default scorecard as the first useful production rubric.
- For each dimension, state the practical question it answers rather than making performance promises.
- State that scores retain rationale and supporting conversation evidence.
- Include a visually distinct roadmap card: **Bring your own criteria or let an evaluator suggest a first rubric — design-partner roadmap.**

### 5. Self-hosting and deployment control

- Heading: **Run the evaluation loop where your team works.**
- Explain that teams choose their deployment environment, database, voice providers, and evaluator provider.
- Link to `/open-source` and the deployment documentation.
- Keep privacy, access control, retention, and provider responsibility language factual and non-compliance-promissory.

### 6. Workflow

Use four steps: import real calls, evaluate meaningful behavior, inspect evidence, then improve and verify on new calls.

### 7. Product proof

- Use the existing dashboard screenshot to substantiate metric health and quality trends.
- Use the existing conversation-detail screenshot to substantiate call-level scores, rationales, transcript, and audio evidence.
- Reduce or remove the generic three-post blog grid from the homepage; retain one contextual resource link instead.

### 8. Final conversion

Close with GitHub-star, self-hosting, and design-partner paths. Maintain GitHub as the visually primary action.

## Asset manifest

| Asset | Homepage use | Source | Implementation |
| --- | --- | --- | --- |
| Abstract evaluation-signal visual | Hero | Code-native HTML/CSS | Build in the site; no raster asset required. |
| `dashboard-analytics.png` | Product-proof section | `docs/assets/screenshots/dashboard-analytics.png` | Externally serve from the public GitHub repository; crop responsively around metric health and trends. |
| `conversation-detail.png` | Evidence-proof section | `docs/assets/screenshots/conversation-detail.png` | Externally serve from the public GitHub repository; crop responsively around scores, rationale, and evidence. |
| GitHub mark | Header and CTAs | Inline accessible SVG | Add as code; do not add an image file. |
| Star icon | Star CTA | Inline accessible SVG | Add as code; do not add an image file. |

### Asset constraints

- Never create or commit new generated, raster, or other binary visual assets for the public site.
- Use the existing public repository screenshots only when their visible content supports the nearby claim.
- Use meaningful alt text and a resilient image container/fallback for externally served screenshots.
- Any replacement screenshot must be anonymized and approved before public use.

## Interface, SEO, and measurement

- Add a reusable GitHub CTA with an accessible inline icon and clear external-link behavior.
- Track GitHub-star CTA clicks separately for the header, hero, and final CTA; also track deployment-documentation clicks, metrics-resource clicks, and design-partner applications.
- Update homepage title, description, Open Graph image copy, H1, and server-rendered text to target self-hosted voice-AI evaluation without duplicating the integration or resource pages.
- Preserve one H1, the canonical URL, useful internal links, and meaningful initial HTML.

## Verification

- Run `npm --prefix site run build`.
- Verify the homepage title, description, canonical URL, rendered HTML, `/robots.txt`, `/sitemap.xml`, and real 404 behavior.
- Check desktop and mobile layouts for the homepage: readable scorecard visual, accessible focus states, no horizontal overflow, responsive screenshot crops, and image fallbacks.
- Verify every public claim against the current evaluator, provider adapters, and deployment documentation before publishing.
- Confirm every GitHub CTA links to `https://github.com/shubhamofbce/vaanieval` and that the design-partner action retains its existing tracking.
