# VaaniEval SEO keyword strategy

Research date: 2026-07-15

## Executive recommendation

VaaniEval should build authority around **voice agent evaluation**, **voice agent QA**, and **self-hosted voice AI evaluation**. The strongest differentiation is not generic voice-agent testing; it is reviewing real production conversations with transcripts, available audio, evaluator rationales, and deployment control.

Before expanding content, fix discoverability. A Google search for `site:vaanieval.com` returned no indexed pages on the research date. Confirm ownership in Google Search Console, submit the sitemap, request indexing for the priority routes, and inspect any crawl or canonical exclusions.

The detailed keyword map is in [`seo-keywords.csv`](./seo-keywords.csv). It intentionally contains no invented search-volume or keyword-difficulty numbers.

## Research process completed

1. Reviewed the repository positioning, supported integrations, product capabilities, public routes, metadata, sitemap, robots rules, and internal links.
2. Checked the live homepage title, description, canonical, H1, and internal navigation in Chrome.
3. Reviewed live Google results for:
   - `voice agent evaluation software`
   - `self-hosted voice agent evaluation`
   - `production voice agent QA`
   - `ElevenLabs conversation evaluation`
   - `Vapi call evaluation`
   - `site:vaanieval.com`
4. Compared search-result language with existing VaaniEval routes to identify intent gaps and avoid keyword cannibalization.
5. Prioritized terms by product fit, conversion potential, current route coverage, and observed SERP relevance rather than unverifiable volume estimates.

## Audience, intent, and conversion

- **Primary audience:** Voice-AI agencies and product, QA, and engineering teams operating production voice agents.
- **Primary conversion:** Qualified design-partner application.
- **Secondary conversion:** GitHub visit or self-hosting adoption.
- **Core problem:** Teams need a repeatable way to evaluate production calls, inspect the evidence behind weak results, and verify improvements.
- **Positioning boundary:** VaaniEval is not currently positioned as a synthetic-call simulation suite or a complete infrastructure-observability platform. Content should not imply those capabilities.

## What the live SERPs indicate

| Query | Observed pattern | Implication for VaaniEval |
| --- | --- | --- |
| voice agent evaluation software | Commercial platforms and comparison articles dominate; Hamming AI, Maxim, Coval, Vapi, Braintrust, Speechmatics, and Cekura appeared prominently. | Use `/voice-ai-evaluation` as the main commercial category page and support it with original workflow evidence. |
| self-hosted voice agent evaluation | Results were mixed and less directly matched; ServiceNow EVA, Hugging Face, comparison content, Langfuse, and a self-hosted voice AI guide appeared. | This is VaaniEval's clearest differentiating cluster. Strengthen the homepage and `/open-source` rather than creating duplicate pages. |
| production voice agent QA | Guides and vendor pages dominated, including Hamming AI, Cekura, Bluejay, Speechmatics, and LangWatch. | `/voice-agent-qa` should become the authoritative workflow page, with the checklist and production guide supporting it. |
| ElevenLabs conversation evaluation | ElevenLabs documentation dominated, followed by vendor integration pages. | Target the narrower third-party workflow intent: importing and reviewing ElevenLabs production conversations in a self-hosted workspace. |
| Vapi call evaluation | Vapi documentation and product content dominated, followed by testing vendors. | Target production-call review and external evaluation workflow, not a generic explanation of Vapi's own eval feature. |
| site:vaanieval.com | Google returned no matching documents. | Indexability and Search Console setup are the immediate P0 workstream. |

Google results were observed in the user's Chrome session and may vary by location and personalization. They are directional evidence, not search-volume data.

## Priority keyword clusters

### P0: Establish indexation and category relevance

1. **voice agent evaluation software** -> `/voice-ai-evaluation`
2. **self-hosted voice AI evaluation** -> `/`
3. **voice agent QA** -> `/voice-agent-qa`
4. **open source voice agent evaluation** -> `/open-source`
5. **voice agent evaluation metrics** -> `/resources/evaluation-metrics`
6. **ElevenLabs voice agent evaluation** -> `/integrations/elevenlabs`
7. **Vapi voice agent evaluation** -> `/integrations/vapi`

These terms align with existing routes and current capabilities. Improve the current pages before creating new URLs.

### P1: Build problem and workflow authority

Create or substantially expand resources for:

- how to evaluate voice agents
- voice agent testing vs production evaluation
- voice agent regression testing
- voice agent hallucination detection
- voice agent task completion metrics
- voice agent conversation review
- voice agent QA scorecard
- production call sampling for voice AI

Each resource should include an original example, scorecard, checklist, screenshot, or reproducible workflow. Generic definitions will not be competitive.

### P2: Capture adjacent and comparison intent

After P0 pages are indexed and collecting impressions, consider:

- voice AI observability
- voice agent conversation analytics
- best voice agent evaluation tools
- voice agent evaluation framework
- voice agent quality assurance software

Comparison content needs attributable, regularly reviewed evidence. Do not publish unsupported feature grids or claim that VaaniEval replaces full-stack observability.

## Route ownership and cannibalization rules

| Route | Own this primary intent | Do not compete for |
| --- | --- | --- |
| `/` | self-hosted voice AI evaluation | detailed product-category and open-source variants |
| `/voice-ai-evaluation` | voice agent evaluation software | generic QA workflow |
| `/voice-agent-qa` | voice agent QA | checklist-only intent |
| `/open-source` | open source voice agent evaluation | broad self-hosted head term owned by homepage |
| `/resources/evaluation-metrics` | voice agent evaluation metrics | full QA workflow |
| `/resources/voice-agent-qa-checklist` | voice agent QA checklist | broad voice agent QA |
| `/integrations/elevenlabs` | ElevenLabs voice agent evaluation | ElevenLabs product documentation intent |
| `/integrations/vapi` | Vapi voice agent evaluation | generic Vapi documentation intent |

Use one primary keyword per URL. Supporting articles should link to the owning route with descriptive anchors and should not reuse the same title/H1 framing.

## Recommended execution plan

### Days 0-14: Get the existing site discovered

1. Verify `https://www.vaanieval.com` in Google Search Console.
2. Submit `https://www.vaanieval.com/sitemap.xml`.
3. Inspect indexing for the homepage and the seven P0 routes.
4. Request indexing after confirming each URL returns `200`, has its own canonical, and is not blocked.
5. Check the deployed sitemap, robots file, real 404 behavior, and canonical host consistency.
6. Add the site and sitemap to Bing Webmaster Tools as a secondary discovery channel.

These actions require human approval or access where they change analytics/search administration.

### Days 15-45: Strengthen existing landing pages

1. Expand `/voice-ai-evaluation` with who it is for, the production evaluation workflow, supported evidence, metrics, deployment model, and FAQs visible on the page.
2. Expand `/voice-agent-qa` with a concrete operating cadence, scorecard example, failure taxonomy, human-review guidance, and regression loop.
3. Clarify the difference between the homepage's self-hosted positioning and `/open-source`'s repository/deployment intent.
4. Add provider-specific setup and evidence examples to the ElevenLabs and Vapi pages without claiming fields that are not always available.
5. Link every supporting resource to its cluster owner and to the design-partner page where relevant.

### Days 46-90: Publish evidence-led supporting content

Publish one strong resource every two to three weeks, starting with:

1. How to evaluate production voice agents
2. Voice agent testing vs production-call evaluation
3. A voice agent QA scorecard with example criteria
4. Voice agent regression testing after a prompt or workflow change
5. Detecting unsupported claims in voice-agent conversations

Avoid publishing many short pages at once. Consolidate overlapping topics into a single useful guide.

## Measurement

Review performance monthly, separating branded from non-branded queries.

| Metric | Use |
| --- | --- |
| Indexed priority URLs | Confirms Google can discover and retain the intended pages. |
| Non-branded impressions by cluster | Shows whether category relevance is growing. |
| Queries and average position by owning URL | Reveals cannibalization and page-topic mismatch. |
| Organic clicks to design-partner page | Measures movement toward the primary conversion. |
| Qualified design-partner applications from organic | Primary business outcome. |
| GitHub clicks from organic landing pages | Secondary conversion. |

Do not optimize for raw traffic alone. A smaller number of qualified visits from teams running production voice agents is more valuable than broad informational traffic with no product fit.

## Validation still required

- Search Console query and indexing data once access is approved.
- Country-level demand and terminology for the target markets.
- Search volume and difficulty from an approved keyword platform, if available.
- Conversion tracking for design-partner and GitHub CTAs.
- Quarterly review of competitor and provider pages because this category changes quickly.

