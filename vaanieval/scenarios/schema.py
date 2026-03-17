from __future__ import annotations

from typing import Any


REQUIRED_FIELDS = {"id", "category", "user_message"}


def validate_scenario_payload(payload: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    missing = REQUIRED_FIELDS - set(payload.keys())
    if missing:
        errors.append(f"missing fields: {', '.join(sorted(missing))}")

    if "id" in payload and not isinstance(payload["id"], str):
        errors.append("id must be a string")
    if "category" in payload and not isinstance(payload["category"], str):
        errors.append("category must be a string")
    if "user_message" in payload and not isinstance(payload["user_message"], str):
        errors.append("user_message must be a string")

    list_fields = ["expected_facts", "forbidden_claims", "safety_flags"]
    for field in list_fields:
        if field in payload and not isinstance(payload[field], list):
            errors.append(f"{field} must be a list")

    if "max_turns" in payload and not isinstance(payload["max_turns"], int):
        errors.append("max_turns must be an integer")

    return errors
