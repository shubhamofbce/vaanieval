"""Shared LangChain-based evaluator implementation."""

from __future__ import annotations

from abc import abstractmethod

from app.services.eval_providers.structured_evaluation import StructuredEvaluationProvider
from langchain_core.messages import HumanMessage, SystemMessage


class LangChainEvaluationProvider(StructuredEvaluationProvider):
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
