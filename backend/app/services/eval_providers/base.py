"""Base evaluation provider interface."""

from abc import ABC, abstractmethod


class EvaluationProvider(ABC):
    """Abstract base class for evaluation providers."""

    def __init__(self, api_key: str, model_name: str):
        """Initialize provider with API key and model name.

        Args:
            api_key: Provider API key
            model_name: Model identifier to use for evaluation
        """
        self.api_key = api_key
        self.model_name = model_name

    @abstractmethod
    def evaluate_conversation(
        self, transcript: str, context: dict | None = None
    ) -> list[dict]:
        """Evaluate a conversation transcript.

        Args:
            transcript: Formatted conversation transcript
            context: Additional context (language, outcome, agent_id, etc.)

        Returns:
            List of metric dictionaries with keys:
            - metric_key: str (task_completion_score, intent_understanding_score, etc.)
            - score_value: int (0-100)
            - confidence: float (0-1)
            - rationale: str
            - evidence: dict or list
        """
        pass

    def summarize_evaluation(
        self,
        transcript: str,
        scores: list[dict],
        context: dict | None = None,
    ) -> dict:
        """Generate a concise QA verdict and next step for an evaluated conversation."""
        return {}

    def get_provider_name(self) -> str:
        """Return the provider name."""
        raise NotImplementedError

    def get_supported_models(self) -> list[str]:
        """Return list of supported model names."""
        raise NotImplementedError
