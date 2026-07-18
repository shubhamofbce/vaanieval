from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import get_settings


@dataclass
class BolnaAgent:
    agent_id: str
    name: str


class BolnaClient:
    def __init__(self, api_key: str) -> None:
        settings = get_settings()
        self._client = httpx.Client(
            base_url=settings.bolna_api_base,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=30.0,
        )

    def list_agents(self) -> list[BolnaAgent]:
        # Bolna agents endpoint: GET /v2/agent/all
        response = self._client.get("/v2/agent/all")
        response.raise_for_status()
        payload = response.json()

        items = payload if isinstance(payload, list) else []
        agents: list[BolnaAgent] = []
        for item in items:
            if not isinstance(item, dict):
                continue
            agent_id = item.get("id")
            name = item.get("agent_name") or agent_id
            if isinstance(agent_id, str) and agent_id:
                agents.append(BolnaAgent(agent_id=agent_id, name=str(name)))
        return agents

    def list_executions(self, *, agent_id: str | None) -> list[dict[str, Any]]:
        # Bolna executions endpoint is nested per agent: GET /agent/{agent_id}/executions
        # It has no server-side pagination or date filters, so callers get the full
        # per-agent history and must paginate/filter client-side.
        if agent_id:
            return self._list_executions_for_agent(agent_id)

        executions: list[dict[str, Any]] = []
        for agent in self.list_agents():
            executions.extend(self._list_executions_for_agent(agent.agent_id))
        return executions

    def _list_executions_for_agent(self, agent_id: str) -> list[dict[str, Any]]:
        response = self._client.get(f"/agent/{agent_id}/executions")
        response.raise_for_status()
        payload = response.json()
        items = payload if isinstance(payload, list) else []
        results: list[dict[str, Any]] = []
        for item in items:
            if not isinstance(item, dict):
                continue
            # The list endpoint does not echo agent_id on some accounts; ensure it is
            # always present so callers can address the detail endpoint directly.
            item.setdefault("agent_id", agent_id)
            results.append(item)
        return results

    def get_execution(self, *, execution_id: str, agent_id: str | None) -> dict[str, Any]:
        resolved_agent_id = agent_id or self._resolve_agent_id(execution_id)
        if not resolved_agent_id:
            raise ValueError(f"Could not resolve agent for Bolna execution {execution_id}")

        response = self._client.get(f"/agent/{resolved_agent_id}/execution/{execution_id}")
        response.raise_for_status()
        detail = response.json()
        if isinstance(detail, dict):
            detail.setdefault("agent_id", resolved_agent_id)
        return detail

    def _resolve_agent_id(self, execution_id: str) -> str | None:
        # Fallback for callers that only persisted the conversation id (e.g. records
        # created before agent_id threading existed). Scans each agent's executions.
        for agent in self.list_agents():
            for execution in self._list_executions_for_agent(agent.agent_id):
                if execution.get("id") == execution_id:
                    return agent.agent_id
        return None

    def get_recording_bytes(self, recording_url: str) -> bytes:
        response = self._client.get(recording_url, follow_redirects=True)
        response.raise_for_status()
        return response.content
