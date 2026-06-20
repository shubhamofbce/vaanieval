from __future__ import annotations

from dataclasses import dataclass

import httpx

from app.core.config import get_settings


@dataclass
class ElevenLabsAgent:
    agent_id: str
    name: str


class ElevenLabsClient:
    def __init__(self, api_key: str) -> None:
        settings = get_settings()
        self._client = httpx.Client(
            base_url=settings.elevenlabs_api_base,
            headers={"xi-api-key": api_key},
            timeout=30.0,
        )

    def list_agents(self) -> list[ElevenLabsAgent]:
        # Endpoint shape can differ by account type. We normalize what we need.
        response = self._client.get("/v1/convai/agents")
        response.raise_for_status()
        payload = response.json()

        agents: list[ElevenLabsAgent] = []
        items = payload.get("agents", []) if isinstance(payload, dict) else []
        for item in items:
            agent_id = item.get("agent_id") or item.get("id")
            name = item.get("name") or agent_id
            if agent_id:
                agents.append(ElevenLabsAgent(agent_id=agent_id, name=name))
        return agents

    def list_conversations(self, cursor: str | None, page_size: int) -> dict:
        params: dict[str, str | int] = {"limit": page_size}
        if cursor:
            params["cursor"] = cursor
        response = self._client.get("/v1/convai/conversations", params=params)
        response.raise_for_status()
        return response.json()

    def get_conversation_detail(self, conversation_id: str) -> dict:
        response = self._client.get(f"/v1/convai/conversations/{conversation_id}")
        response.raise_for_status()
        return response.json()

    def run_conversation_analysis(self, conversation_id: str) -> dict:
        response = self._client.post(f"/v1/convai/conversations/{conversation_id}/analysis/run")
        response.raise_for_status()
        return response.json()

    def get_conversation_audio_bytes(self, conversation_id: str) -> bytes:
        response = self._client.get(f"/v1/convai/conversations/{conversation_id}/audio")
        response.raise_for_status()
        return response.content
