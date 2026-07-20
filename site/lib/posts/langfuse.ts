import { BlogPost } from '../site'

export const langfusePost: BlogPost = {
  slug: 'vaanieval-vs-langfuse',
  title: 'Langfuse vs VaaniEval: AI Evaluation Compared',
  description: 'Compare open-source Langfuse with source-available VaaniEval: general-purpose LLM tracing vs a voice-native QA workspace.',
  publishedAt: '2026-07-18',
  readingTime: '6 min read',
  category: 'Alternatives',
  content: [
    'For developers who prioritize data privacy and cost control, self-hosting can be attractive. Langfuse is open source, while VaaniEval is source-available and requires prior written permission for commercial or noncommercial use. The tools also serve different development needs.',
    'This comparison examines the differences between Langfuse\'s general-purpose LLM engineering platform and VaaniEval\'s specialized voice QA workspace.',
    '## The Core Product Focus',
    'Langfuse is a comprehensive **LLM engineering platform**. It focuses on tracing nesting prompt chains, managing prompts, tracking LLM costs, and conducting evaluations across any text-based LLM application. It is widely used to monitor chat agents, retrieval-augmented generation (RAG) pipelines, and general software-LLM boundaries.',
    'VaaniEval is a **voice-agent QA workspace**. It is built specifically for voice AI agents, providing direct API imports from voice providers (ElevenLabs, Vapi, Bolna). It features a dedicated review interface where developers can play back call audio, view synchronized speaker turns, and score voice-native qualitative behaviors.',
    '## General LLM Tracing vs. Voice-Native Workflows',
    'Because they focus on different mediums, their capabilities differ:',
    '- **Langfuse (Trace-Centric):** Langfuse tracks detailed execution spans. If you need to trace how a user query traverses a vector database, gets combined with a template, and calls an LLM, Langfuse\'s nested trace trees are excellent. It is designed to capture every micro-step of a text-based LLM pipeline.',
    '- **VaaniEval (Conversation-Centric):** VaaniEval evaluates the final call recording and transcript. Rather than tracing backend software spans, VaaniEval connects to your voice orchestrator and imports the complete call record—including telephony metadata (hangup reason, cost, duration) and audio recordings. This allows you to review the actual conversation and rate behaviors (like Task Completion or Intent Understanding) using a specialized, voice-focused scorecard.',
    '## Different Licensing and Self-Hosting Models',
    'The products use materially different licensing models:',
    '- **Langfuse:** Its open-source license governs use, modification, and self-hosting.',
    '- **VaaniEval:** Its source can be inspected, but use, modification, and self-hosting require prior written permission.',
    '- **Operating cost:** An authorized self-hosted deployment still incurs infrastructure, maintenance, and evaluator-provider costs.',
    '## When to Use Which?',
    'Choose **Langfuse** if you are building text-based LLM applications, need deep trace logging of nested software execution chains, track prompt versions, and require a general-purpose AI monitoring tool.',
    'Choose **VaaniEval** if you are deploying voice agents (via ElevenLabs, Vapi, or Bolna), need an integrated workspace to listen to call recordings next to transcripts, want to evaluate voice-specific outcomes, and are prepared to request permission for use.',
    '[Explore the self-hosted VaaniEval architecture](/open-source)',
    '[Review the voice-agent evaluation metrics guide](/resources/evaluation-metrics)',
    '[Apply for the free 60-day design-partner pilot](/design-partners)',
  ]
}
