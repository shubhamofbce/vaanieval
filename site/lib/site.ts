export const siteConfig = {
  name: 'VaaniEval',
  description: 'Open-source quality assurance and evaluation workspace for production voice AI agents.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://vaanieval.vercel.app',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://app-vaanieval.vercel.app',
  githubUrl: 'https://github.com/shubhamofbce/vaanieval',
  contactUrl: 'https://github.com/shubhamofbce/vaanieval/issues/new?title=Design%20partner%20application&labels=design-partner',
}

export type BlogPost = {
  slug: string
  title: string
  description: string
  publishedAt: string
  readingTime: string
  category: string
  content: string[]
}

export const posts: BlogPost[] = [
  {
    slug: 'voice-agent-qa-production-guide',
    title: 'A practical QA process for production voice agents',
    description: 'How to replace random call sampling with a repeatable conversation review and evaluation workflow.',
    publishedAt: '2026-07-04',
    readingTime: '7 min read',
    category: 'Voice AI QA',
    content: [
      'Voice agents fail in ways that aggregate dashboards hide. A call may complete while the agent gives an unsupported answer, misses an interruption, or leaves the customer without a clear resolution.',
      'A useful QA process starts with production conversations. Import calls continuously, retain transcript and audio context, and evaluate the same small set of business-critical behaviors on every review cycle.',
      'Begin with task completion, unsupported claims, fallback quality, and latency. Define what acceptable evidence looks like for each metric. Review failed conversations with the transcript and audio together, because timing and interruption problems are often invisible in text.',
      'Treat scores as prioritization signals rather than absolute truth. Evaluator rationales should point reviewers to evidence, and uncertain or high-impact cases should remain subject to human review.',
      'Close the loop by grouping repeated failures, assigning an owner, changing the agent, and checking new production calls for regression. The outcome is not a larger dashboard; it is a shorter path from a bad call to a verified fix.',
    ],
  },
  {
    slug: 'voice-ai-evaluation-metrics',
    title: 'Voice AI evaluation metrics that lead to actionable fixes',
    description: 'A focused metric framework for task success, hallucinations, fallback behavior, and operational quality.',
    publishedAt: '2026-07-04',
    readingTime: '6 min read',
    category: 'Evaluation',
    content: [
      'The best voice-agent metrics connect directly to a product or engineering decision. A score that cannot tell the team what to inspect or change creates reporting work without improving the agent.',
      'Task completion measures whether the customer reached the intended outcome. Resolution quality asks whether that outcome was correct and complete. Unsupported-claim detection catches answers that are not grounded in available policy or data.',
      'Fallback quality should distinguish a safe recovery from an unhelpful refusal or repeated loop. Operational signals such as latency, interruptions, silence, and premature termination add the audio context that transcript-only evaluation misses.',
      'Use a small stable scorecard first. Store the rationale and supporting conversation evidence alongside every score. Revisit thresholds only after comparing evaluator judgments with human reviewers on representative calls.',
      'Report trends by agent, use case, and time period, but preserve a direct path back to individual conversations. Aggregates reveal where to look; evidence explains what to fix.',
    ],
  },
  {
    slug: 'self-hosted-voice-ai-evaluation',
    title: 'Why self-host voice AI conversation evaluation?',
    description: 'The operational and privacy tradeoffs of keeping call data inside your own environment.',
    publishedAt: '2026-07-04',
    readingTime: '5 min read',
    category: 'Self-hosting',
    content: [
      'Production calls may contain customer identifiers, business context, and sensitive support details. Evaluation adds another processing layer, so teams need a clear model for where data is stored and which providers receive it.',
      'A self-hosted evaluation workspace gives the operator control over the application, database, credentials, and retention policy. It can also make integration and debugging easier when the team needs direct access to normalized conversation records.',
      'Self-hosting does not remove security work. Teams still need encrypted credentials, access controls, backups, audit practices, provider agreements, and a documented deletion process.',
      'VaaniEval is open source so teams can inspect the data path and deploy the workspace in an environment they control. Evaluator and voice-provider credentials remain configurable rather than being tied to a single hosted vendor.',
    ],
  },
]
