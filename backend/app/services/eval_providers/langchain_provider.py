"""Shared LangChain-based evaluator implementation."""

from __future__ import annotations

import json
from abc import abstractmethod

from langchain_core.messages import HumanMessage, SystemMessage

from app.services.eval_providers.base import EvaluationProvider


class LangChainEvaluationProvider(EvaluationProvider):
    @abstractmethod
    def create_chat_model(self):
        """Return a configured LangChain chat model instance."""

    def evaluate_conversation(self, transcript: str, context: dict | None = None) -> list[dict]:
        if context is None:
            context = {}

        llm = self.create_chat_model()
        response = llm.invoke(
            [
                SystemMessage(content=self._build_instructions()),
                HumanMessage(content=self._build_prompt(transcript, context)),
            ]
        )
        text = self._extract_text(response.content)
        return self._parse_scores(text)

    def _build_instructions(self) -> str:
        return (
            "You are an expert evaluator of voice agent conversations. "
            "Score the conversation on 4 metrics, returning strict JSON only. "
            "Return a JSON array with exactly 4 objects. "
            "Each object must contain: metric_key, score_value, confidence, rationale, evidence. "
            "Allowed metric_keys: task_completion_score, intent_understanding_score, "
            "required_info_capture_score, ai_detectability_score. "
            "score_value must be an integer from 0 to 100. confidence must be from 0 to 1."
        )

    def _build_prompt(self, transcript: str, context: dict) -> str:
        prompt = ["Conversation context:"]
        if context.get("language"):
            prompt.append(f"Language: {context['language']}")
        if context.get("outcome"):
            prompt.append(f"Outcome: {context['outcome']}")
        if context.get("provider_agent_id"):
            prompt.append(f"Agent: {context['provider_agent_id']}")

        prompt.extend(
            [
                "",
                "Transcript:",
                transcript,
                "",
                "Evaluate on these 4 metrics:",
                "1. task_completion_score: Did the agent accomplish the user's goal?",
                "2. intent_understanding_score: Did the agent understand what the user wanted?",
                "3. required_info_capture_score: Did the agent capture all necessary information?",
                "4. ai_detectability_score: Was the agent obviously AI or convincingly human-like?",
                "",
                "Return strict JSON only. For ai_detectability_score, higher means more detectable as AI.",
            ]
        )
        return "\n".join(prompt)

    def _extract_text(self, content) -> str:
        if isinstance(content, str):
            return content

        if isinstance(content, list):
            text_parts: list[str] = []
            for item in content:
                if isinstance(item, str):
                    text_parts.append(item)
                elif isinstance(item, dict):
                    text_value = item.get("text")
                    if isinstance(text_value, str):
                        text_parts.append(text_value)

            if text_parts:
                return "\n".join(text_parts)

        raise ValueError("Evaluator response did not include parseable output text")

    def _parse_scores(self, text: str) -> list[dict]:
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            start = text.find("[")
            end = text.rfind("]")
            if start == -1 or end == -1 or end <= start:
                raise ValueError("Could not parse score JSON from evaluator response")
            parsed = json.loads(text[start : end + 1])

        if not isinstance(parsed, list):
            raise ValueError("Evaluator response must be a JSON list")

        return [item for item in parsed if isinstance(item, dict)]