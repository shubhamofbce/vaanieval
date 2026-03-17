"""
Setup script to create the ElevenLabs voice agent and configure it with
a knowledge base of ElevenLabs API documentation.

Run once: python examples/setup_agent.py
"""

import os
import sys
from dotenv import load_dotenv, set_key
from elevenlabs import ElevenLabs

load_dotenv()

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not ELEVENLABS_API_KEY or ELEVENLABS_API_KEY == "your-elevenlabs-api-key":
    print("Error: Set ELEVENLABS_API_KEY in your .env file.")
    sys.exit(1)

if not OPENAI_API_KEY or OPENAI_API_KEY == "your-openai-api-key":
    print("Error: Set OPENAI_API_KEY in your .env file.")
    sys.exit(1)

client = ElevenLabs(api_key=ELEVENLABS_API_KEY)

# ── Pre-created resources (to avoid recreating on each run) ──────────────────

SECRET_ID = "tNNmGZIfcmSZ35IhCCeh"

kb_docs = [
    {"type": "url", "name": "API Introduction", "id": "CKAxZnuXFVfYRY0h7RGd"},
    {"type": "url", "name": "Text to Speech", "id": "JcFl2oUsiUZ6ifhSJx2B"},
    {"type": "url", "name": "Conversational AI Overview", "id": "BPpvkW8WpL3X0UYF1uAP"},
    {"type": "url", "name": "Models Overview", "id": "SktW1odYAlb4Ni3LW9gH"},
]

# ── Step 3: Create the agent ─────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a friendly and knowledgeable developer support assistant \
specializing in the ElevenLabs API and platform. Your role is to help developers \
understand and use ElevenLabs APIs, SDKs, and features effectively.

Tasks:
- Answer questions about ElevenLabs API endpoints, SDKs (Python, JS, React, Swift, Kotlin), and features.
- Explain code examples, request/response formats, parameters, authentication, and error handling.
- Guide developers through integration patterns: Text-to-Speech, Speech-to-Text, \
  Conversational AI agents, Voice Cloning, Sound Effects, and Audio Isolation.
- When relevant, reference specific API endpoints, parameter names, and code snippets.

Guidelines:
- Be concise. Limit responses to a few sentences unless the developer asks for more detail.
- Use information from your knowledge base (ElevenLabs documentation) first.
- If you are unsure about something, say so honestly rather than guessing.
- If a question is outside the scope of ElevenLabs, politely let the developer know."""

FIRST_MESSAGE = "Hey! I'm your ElevenLabs API docs assistant. Ask me anything about the ElevenLabs API — endpoints, SDKs, voice cloning, conversational AI, or anything else. How can I help?"

print("Creating ElevenLabs conversational agent...")

agent = client.conversational_ai.agents.create(
    name="ElevenLabs API Docs Assistant",
    conversation_config={
        "agent": {
            "first_message": FIRST_MESSAGE,
            "language": "en",
            "prompt": {
                "prompt": SYSTEM_PROMPT,
                "llm": "gpt-4o",
                "knowledge_base": kb_docs,
            },
        },
    },
)

agent_id = agent.agent_id
print(f"  Agent created! ID: {agent_id}")

# ── Step 4: Save agent ID to .env ────────────────────────────────────────────

env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
set_key(env_path, "ELEVENLABS_AGENT_ID", agent_id)
print(f"  Agent ID saved to .env")

print()
print("=" * 60)
print("Setup complete!")
print(f"  Agent ID: {agent_id}")
print()
print("Next steps:")
print("  1. Run the voice agent:  python examples/run_conversation.py")
print("  2. Or open examples/web/index.html in a browser (update agent-id).")
print("=" * 60)
