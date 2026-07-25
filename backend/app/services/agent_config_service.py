"""Capture, normalize, compare, and redact Vapi assistant configuration."""
from __future__ import annotations

import hashlib
import json
from datetime import timedelta
from typing import Any

from app.models.provider import AgentConfigVersion, ProviderAgent
from app.services.credentials import decrypt_secret, encrypt_secret
from app.services.security import utc_now
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

SENSITIVE_KEY_PARTS = ("secret", "token", "password", "api_key", "apikey", "authorization", "header", "query", "credential")
CODE_KEYS = {"code", "source", "sourcecode", "functioncode"}
ALLOWED_ASSISTANT_KEYS = (
    "firstMessage", "firstMessageMode", "model", "voice", "transcriber", "recordingEnabled",
    "endCallFunctionEnabled", "serverMessages", "clientMessages", "silenceTimeoutSeconds",
    "maxDurationSeconds", "backgroundSound", "backchannelingEnabled", "voicemailDetection",
    "analysisPlan", "artifactPlan", "startSpeakingPlan", "stopSpeakingPlan", "server", "hipaaEnabled",
)


def _safe(value: Any, key: str = "") -> Any:
    lowered = key.replace("-", "_").lower()
    if lowered in CODE_KEYS:
        return "[implementation hidden]"
    if any(part in lowered for part in SENSITIVE_KEY_PARTS):
        return "[redacted]"
    if isinstance(value, dict):
        return {str(k): _safe(v, str(k)) for k, v in sorted(value.items()) if str(k) not in {"id", "createdAt", "updatedAt", "metadata"}}
    if isinstance(value, list):
        return [_safe(item, key) for item in value]
    return value


def _tool_document(tool: dict[str, Any]) -> dict[str, Any]:
    return _safe({key: value for key, value in tool.items() if key not in {"createdAt", "updatedAt", "metadata"}})


def normalize_vapi_configuration(payload: dict[str, Any]) -> dict[str, Any]:
    assistant = payload.get("assistant") if isinstance(payload.get("assistant"), dict) else payload
    model = assistant.get("model") if isinstance(assistant.get("model"), dict) else {}
    inline_tools = model.get("tools") if isinstance(model.get("tools"), list) else assistant.get("tools", [])
    referenced = payload.get("referenced_tools") if isinstance(payload.get("referenced_tools"), list) else []
    document = {key: _safe(assistant[key], key) for key in ALLOWED_ASSISTANT_KEYS if key in assistant}
    if "model" in document and isinstance(document["model"], dict):
        document["model"].pop("tools", None)
    document["tools"] = {
        "inline": sorted((_tool_document(item) for item in inline_tools if isinstance(item, dict)), key=lambda item: json.dumps(item, sort_keys=True)),
        "referenced": sorted((_tool_document(item) for item in referenced if isinstance(item, dict)), key=lambda item: json.dumps(item, sort_keys=True)),
    }
    return document


def canonical_hash(document: dict[str, Any]) -> str:
    encoded = json.dumps(document, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def _category(path: str) -> str:
    if "message" in path.lower() or path.startswith("model.messages"):
        return "prompt"
    if path.startswith("tools"):
        return "tools"
    if path.startswith("model"):
        return "model"
    if path.startswith("voice"):
        return "voice"
    if path.startswith("transcriber"):
        return "transcriber"
    if path.startswith("firstMessage"):
        return "first message"
    if any(path.startswith(key) for key in ("silence", "maxDuration", "recording", "endCall", "startSpeaking", "stopSpeaking", "voicemail", "backchannel", "background")):
        return "call behavior"
    return "other configuration"


def _diff(before: Any, after: Any, path: str = "") -> list[dict[str, Any]]:
    if isinstance(before, dict) and isinstance(after, dict):
        result: list[dict[str, Any]] = []
        for key in sorted(set(before) | set(after)):
            result.extend(_diff(before.get(key), after.get(key), f"{path}.{key}" if path else key))
        return result
    if before == after:
        return []
    return [{"path": path, "category": _category(path), "before": before, "after": after}]


def capture_configuration(db: Session, *, agent: ProviderAgent, provider_updated_at, payload: dict[str, Any]) -> tuple[bool, AgentConfigVersion]:
    document = normalize_vapi_configuration(payload)
    digest = canonical_hash(document)
    latest = db.scalar(select(AgentConfigVersion).where(AgentConfigVersion.provider_agent_id == agent.id).order_by(AgentConfigVersion.version_number.desc()))
    if latest and latest.configuration_hash == digest:
        return False, latest
    previous = json.loads(decrypt_secret(latest.snapshot_encrypted)) if latest else None
    changes = _diff(previous, document) if previous is not None else []
    version = AgentConfigVersion(
        provider_agent_id=agent.id,
        version_number=(latest.version_number + 1) if latest else 1,
        provider_updated_at=provider_updated_at,
        configuration_hash=digest,
        snapshot_encrypted=encrypt_secret(json.dumps(document, sort_keys=True, separators=(",", ":"))),
        change_summary_json=json.dumps(sorted({item["category"] for item in changes})),
    )
    db.add(version)
    db.flush()
    db.execute(delete(AgentConfigVersion).where(AgentConfigVersion.provider_agent_id == agent.id, AgentConfigVersion.captured_at < utc_now() - timedelta(days=30)))
    return True, version


def version_diff(before: AgentConfigVersion | None, version: AgentConfigVersion) -> list[dict[str, Any]]:
    current = json.loads(decrypt_secret(version.snapshot_encrypted))
    prior = json.loads(decrypt_secret(before.snapshot_encrypted)) if before else None
    return _diff(prior, current) if prior is not None else []
