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
    title: 'Self-Hosted vs. Closed-Source Voice AI Evaluations: A Compliance and Privacy Analysis',
    description: 'How closed-source SaaS evaluation tools expose sensitive call data, and how a self-hosted open-source framework like VaaniEval secures HIPAA, GDPR, and PCI compliance.',
    publishedAt: '2026-07-04',
    readingTime: '10 min read',
    category: 'Compliance & Security',
    content: [
      'Evaluating production voice AI agents requires capturing, processing, and analyzing high-fidelity audio streams and conversation transcripts. In highly regulated sectors—such as healthcare, financial services, insurance, and telecommunications—these datasets are subject to stringent legal and security frameworks.',
      'This analysis evaluates the compliance advantages of the self-hosted, open-source approach represented by **VaaniEval** compared to closed-source Software-as-a-Service (SaaS) alternatives.',
      '## The Compliance Minefield of Voice AI Observability',
      'Voice data is uniquely sensitive. Unlike static database records or text-only chatbot logs, voice interactions pose multi-dimensional data privacy risks:',
      '- **Biometric Identifiability (GDPR Classifications)**: Voiceprints, tone, cadence, and vocal characteristics are classified as biometric data. Under frameworks like the GDPR, processing biometric data for identification purposes carries strict consent requirements and high regulatory penalties.',
      '- **Unstructured PII and PHI**: During voice interactions, customers frequently speak Protected Health Information (PHI) or Personally Identifiable Information (PII) such as Social Security Numbers, credit card numbers, dates of birth, and home addresses. Unlike structured fields, this information cannot be easily isolated without transcribing and scanning the entire audio file.',
      '- **The Sub-Processor Chain Multiplier**: A typical SaaS voice AI stack involves multiple hops: Customer Voice -> Voice Gateway (Vapi/ElevenLabs) -> Evaluation SaaS -> Evaluator LLM (OpenAI/Anthropic). For every third-party SaaS introduced, the organization must perform vendor risk assessments, sign legal agreements, and audit sub-processors.',
      '## Core Compliance Frameworks & Impact on Voice AI',
      'Let us review the key regulatory frameworks governing voice data:',
      '- **HIPAA (Health Insurance Portability & Accountability Act)**: Any audio or transcript containing health conditions, patient names, or medical records is PHI. SaaS providers must sign a Business Associate Agreement (BAA). Standard SaaS pricing models often lock BAAs behind expensive enterprise tiers.',
      '- **GDPR (General Data Protection Regulation - EU 2016/679)**: Audio recordings contain biometric data. If data is stored on a US-based SaaS database without a robust data transfer agreement (e.g., standard contractual clauses), it violates data transfer restrictions. Data deletion requests must propagate to all backups and sub-processors.',
      '- **PCI-DSS v4.0 (Payment Card Industry Data Security Standard)**: Voice agents capturing payment info in audio or transcripts bring the evaluation platform into the PCI scope. Audio recordings containing cardholder data must be encrypted and redacted to prevent accidental storage of CVV/PAN.',
      '- **SOC 2 Type II (Security, Confidentiality, & Privacy)**: Enterprise purchasing teams require third-party SaaS vendors to have an active SOC 2 Type II report. Startup SaaS providers often only have SOC 2 Type I or lack audits entirely, delaying procurement for months.',
      '## Closed-Source Voice AI Eval Providers: How They Deal with Compliance',
      'A growing ecosystem of closed-source startups and generalist LLM evaluation tools focus on voice AI evaluations and simulation. However, their closed SaaS architecture introduces specific compliance bottlenecks.',
      'Many SaaS providers like **Hamming AI**, **Coval**, **Maxim AI**, **Braintrust**, and **Tuner** have introduced features to cope with data privacy. For example, Braintrust offers a hybrid enterprise tier where evaluation data is stored in the customer\'s cloud storage (like AWS S3), while the control plane remains SaaS. Hamming AI and Maxim AI offer SOC 2 compliance and custom enterprise BAAs for HIPAA compliance. Tuner and Roark rely on client-side data masking before ingestion.',
      'However, these SaaS compliance mechanisms introduce significant friction:',
      '- **Prolonged Procurement Cycles**: Security reviews for SaaS platforms processing voice data typically take 3 to 6 months as teams audit the vendor\'s SOC 2, penetration test reports, sub-processors, and disaster recovery plans.',
      '- **Hidden Sub-processors**: SaaS eval platforms run evaluations using external LLM APIs (e.g., OpenAI, Anthropic). The customer is forced to inherit the vendor\'s sub-processors, multiplying the compliance risk.',
      '- **Data Training Leakage**: Many SaaS platforms retain user data to improve their internal algorithms and evaluator models. Preventing this requires custom contractual carve-outs.',
      '- **Data Residency Violated**: Ingested calls are stored in the SaaS vendor\'s centralized region (usually US-East), violating strict regional data residency rules in the EU, Canada, or APAC.',
      '## The Self-Hosted Paradigm: How VaaniEval Streamlines Compliance',
      'VaaniEval\'s open-source, self-hosted model addresses compliance concerns by shifting data control back to the enterprise.',
      '[VPC_DIAGRAM]',
      '### 1. Data Residency & Complete Perimeter Control',
      'Because VaaniEval is self-hosted, all conversation transcripts, audio playback streams, and evaluation metadata remain inside the enterprise\'s private network boundary (e.g., AWS, GCP, Azure, or local bare-metal servers). No data is telemetry-shipped to a third-party startup server. Supported databases (SQLite and PostgreSQL) run locally or on a private managed instance (e.g., AWS RDS or self-hosted Neon). The enterprise controls access rules, backups, and network policies.',
      '### 2. Direct Integration with Compliant LLM Endpoints',
      'SaaS evaluation platforms act as middlemen, routing your raw conversations to LLMs. VaaniEval cuts out the intermediary. By setting **CREDENTIAL_ENCRYPTION_KEY** and **OPENAI_API_BASE** in the backend configuration, evaluations can route directly to Azure OpenAI Service (with zero data retention guarantees) or to self-hosted models running via vLLM / Ollama inside the same VPC.',
      '### 3. Open Source Extensibility for Data Redaction',
      'Because VaaniEval is open-source (MIT License), developers have full access to customize the ingestion and storage layers. Developers can modify the provider adapters to scrub PII/PHI (like names, telephone numbers, and account numbers) before storing transcripts in the database. Furthermore, enterprises can implement automatic retention limits, deleting audio files from storage after scoring is complete while keeping only anonymized scores, fulfilling GDPR\'s data minimization principles.',
      '## Security & Compliance Deployment Blueprint',
      'To deploy VaaniEval in a fully compliant enterprise environment, follow this architectural setup:',
      '- **Step 1: Network Isolation**: Deploy the frontend static assets and backend FastAPI container inside a Private Subnet of your Virtual Private Cloud (VPC). Use an Internal Application Load Balancer (ALB) to restrict access to employees on the corporate VPN/Tailscale network.',
      '- **Step 2: Database and Storage Security**: Deploy a managed PostgreSQL database with Encryption at Rest enabled. Store media files (voice recordings) in an enterprise-managed private bucket (e.g., AWS S3) configured with IAM Roles and Object Lifecycle Policies to auto-delete audio files after 14 days.',
      '- **Step 3: Zero-Retention LLM Routing**: Configure your backend environment variables to route evaluations only to zero-retention or private endpoints, ensuring HIPAA BAA coverage is maintained.',
      'By leveraging VaaniEval as a self-hosted, open-source workspace, organizations eliminate third-party SaaS risks, enforce data residency, integrate with approved LLMs, and inspect their code, accelerating their time-to-market.'
    ],
  },
]
