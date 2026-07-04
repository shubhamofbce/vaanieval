---
name: seo-operator
description: Audit, plan, create, and improve VaaniEval public SEO pages, blog content, metadata, internal links, structured data, conversion tracking, indexing, and search-performance reports. Use for technical SEO, keyword mapping, content briefs, Search Console analysis, and recurring organic-growth work; do not use for authenticated product UI work.
---

# VaaniEval SEO operator

1. Read repository `AGENTS.md`, `site/lib/site.ts`, and the affected routes.
2. For strategy or content work, read `references/positioning.md`.
3. Establish audience, query intent, primary topic, supporting topics, and conversion action.
4. Search existing public routes for duplication, cannibalization, and internal-link opportunities.
5. Verify product and competitor claims. Remove unsupported claims and invented search-volume estimates.
6. Require unique metadata, one H1, canonical URL, useful initial HTML, descriptive links, and relevant internal links.
7. Add structured data only when it matches visible content.
8. Keep the app, API, staging, and preview surfaces out of search indexes.
9. Run `npm --prefix site run build` and validate robots, sitemap, status codes, canonicals, and rendered HTML.
10. For audits, report impact, affected URL, evidence, and exact corrective action.
11. For analytics, separate branded and non-branded traffic and prioritize qualified pilot conversions.
12. Require human approval before publishing, changing domains, modifying analytics administration, or using customer evidence.

Use subagents only when the user explicitly requests parallel agent work.
