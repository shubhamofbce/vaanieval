"""
Terminal-based voice conversation client for the ElevenLabs API Docs Assistant.

Usage: python examples/run_conversation.py

Requires a microphone and speakers. Press Ctrl+C to stop the conversation.
"""

import os
import sys
from dotenv import load_dotenv
from elevenlabs import ElevenLabs
from elevenlabs.conversational_ai.conversation import Conversation
from audio_interface import SoundDeviceAudioInterface

load_dotenv()

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
AGENT_ID = os.getenv("ELEVENLABS_AGENT_ID")

if not ELEVENLABS_API_KEY or ELEVENLABS_API_KEY == "your-elevenlabs-api-key":
    print("Error: Set ELEVENLABS_API_KEY in your .env file.")
    sys.exit(1)

if not AGENT_ID:
    print("Error: ELEVENLABS_AGENT_ID not set. Run examples/setup_agent.py first.")
    sys.exit(1)

client = ElevenLabs(api_key=ELEVENLABS_API_KEY)


def on_agent_response(text: str) -> None:
    print(f"\n  Agent: {text}")


def on_user_transcript(text: str) -> None:
    print(f"\n  You:   {text}")


def on_agent_response_correction(original: str, corrected: str) -> None:
    print(f"\n  Agent (corrected): {corrected}")


def on_latency(latency_ms: int) -> None:
    print(f"  [latency: {latency_ms}ms]", end="", flush=True)


print("=" * 60)
print("  ElevenLabs API Docs Voice Assistant")
print("=" * 60)
print()
print("  Speak into your microphone to ask a question.")
print("  Press Ctrl+C to end the conversation.")
print()

conversation = Conversation(
    client=client,
    agent_id=AGENT_ID,
    requires_auth=True,
    audio_interface=SoundDeviceAudioInterface(),
    callback_agent_response=on_agent_response,
    callback_agent_response_correction=on_agent_response_correction,
    callback_user_transcript=on_user_transcript,
    callback_latency_measurement=on_latency,
)

conversation.start_session()
print("  Session started. Listening...\n")

try:
    conversation.wait_for_session_end()
except KeyboardInterrupt:
    print("\n\n  Ending conversation...")
    conversation.end_session()
    print("  Done. Goodbye!")
