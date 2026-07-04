# VaaniEval repository guidance

## Public site and SEO

- The public acquisition site lives in `site/`; the authenticated product lives in `frontend/`.
- Public claims must be supported by the current repository or an attributable source. Do not invent customer counts, performance improvements, compliance claims, or provider capabilities.
- Every public route needs a unique title, description, canonical URL, one H1, useful internal links, and meaningful server-rendered content.
- Keep authenticated, API, preview, and staging surfaces out of search indexes.
- The primary conversion is a qualified design-partner application. GitHub is the secondary conversion.
- Prefer original examples, screenshots, evaluation evidence, and reproducible guidance over generic SEO text.
- Do not generate doorway pages, purchased-link campaigns, hidden text, or thin programmatic pages.

## Verification

- Public site: `npm --prefix site run build`
- Product app: `npm --prefix frontend run build`
- Verify `/robots.txt`, `/sitemap.xml`, real 404 responses, canonical metadata, and rendered HTML before deployment.
- Run browser checks at desktop and mobile sizes for homepage, one integration page, the blog index, one article, and the design-partner page.

## Publishing controls

- Public publishing, domain/DNS changes, analytics administration, customer quotes, and outreach require human approval.
- Never include credentials, customer conversation content, personal information, or unapproved customer names in public material.
