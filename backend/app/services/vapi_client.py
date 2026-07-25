from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date, datetime, time, timezone

import httpx

from app.core.config import get_settings


@dataclass
class VapiAgent:
    agent_id: str
    name: str


class VapiClient:
    def __init__(self, api_key: str) -> None:
        settings = get_settings()
        self._client = httpx.Client(
            base_url=settings.vapi_api_base,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=30.0,
        )

    def list_agents(self) -> list[VapiAgent]:
        # Vapi assistants endpoint: GET /assistant
        response = self._client.get("/assistant")
        response.raise_for_status()
        payload = response.json()

        items = payload if isinstance(payload, list) else []
        agents: list[VapiAgent] = []
        for item in items:
            if not isinstance(item, dict):
                continue
            agent_id = item.get("id")
            name = item.get("name") or agent_id
            if isinstance(agent_id, str) and agent_id:
                agents.append(VapiAgent(agent_id=agent_id, name=str(name)))
        return agents

    def get_assistant(self, assistant_id: str) -> dict:
        response = self._client.get(f"/assistant/{assistant_id}")
        response.raise_for_status()
        payload = response.json()
        return payload if isinstance(payload, dict) else {}

    def get_tool(self, tool_id: str) -> dict:
        response = self._client.get(f"/tool/{tool_id}")
        response.raise_for_status()
        payload = response.json()
        return payload if isinstance(payload, dict) else {}

    def list_calls(
        self,
        *,
        cursor: str | None,
        page_size: int,
        assistant_id: str | None,
        start_date: str | None,
        end_date: str | None,
    ) -> dict:
        cursor_state = self._decode_cursor(cursor)
        before_created_at = cursor_state.get("before_created_at")
        skipped_ids = {
            item
            for item in cursor_state.get("skip_ids", [])
            if isinstance(item, str) and item
        }

        request_limit = min(max(page_size * 3, 100), 500)
        params: dict[str, str | int] = {"limit": request_limit}
        if assistant_id:
            params["assistantId"] = assistant_id

        if start_date:
            normalized_start = self._normalize_date_bound(start_date, is_end=False)
            if normalized_start:
                params["createdAtGe"] = normalized_start

        requested_end = before_created_at or self._normalize_date_bound(end_date, is_end=True)
        if requested_end:
            params["createdAtLe"] = requested_end

        response = self._client.get("/call", params=params)
        response.raise_for_status()
        payload = response.json()

        items = payload if isinstance(payload, list) else []
        items = [item for item in items if isinstance(item, dict)]
        items.sort(
            key=lambda item: (
                str(item.get("createdAt") or ""),
                str(item.get("id") or ""),
            ),
            reverse=True,
        )

        if before_created_at and skipped_ids:
            items = [
                item
                for item in items
                if not (
                    item.get("createdAt") == before_created_at
                    and isinstance(item.get("id"), str)
                    and item["id"] in skipped_ids
                )
            ]

        page_items = items[:page_size]
        next_cursor: str | None = None
        if page_items:
            boundary_created_at = page_items[-1].get("createdAt")
            boundary_ids = [
                item["id"]
                for item in page_items
                if item.get("createdAt") == boundary_created_at and isinstance(item.get("id"), str)
            ]
            if len(page_items) == page_size:
                next_cursor = json.dumps(
                    {
                        "before_created_at": boundary_created_at,
                        "skip_ids": boundary_ids,
                    }
                )

        return {"conversations": page_items, "next_cursor": next_cursor}

    def get_call(self, call_id: str) -> dict:
        response = self._client.get(f"/call/{call_id}")
        response.raise_for_status()
        return response.json()

    @staticmethod
    def _decode_cursor(cursor: str | None) -> dict:
        if not cursor:
            return {}
        try:
            payload = json.loads(cursor)
        except json.JSONDecodeError:
            return {}
        return payload if isinstance(payload, dict) else {}

    @staticmethod
    def _normalize_date_bound(raw_value: str | None, *, is_end: bool) -> str | None:
        if not raw_value:
            return None
        try:
            parsed = datetime.fromisoformat(raw_value.replace("Z", "+00:00"))
        except ValueError:
            try:
                parsed_date = date.fromisoformat(raw_value)
            except ValueError:
                return None
            parsed_time = time.max if is_end else time.min
            parsed = datetime.combine(parsed_date, parsed_time)

        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        else:
            parsed = parsed.astimezone(timezone.utc)

        return parsed.isoformat().replace("+00:00", "Z")
