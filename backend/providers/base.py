"""
Base Provider Interface

All AI providers must implement this interface.
"""

from abc import ABC, abstractmethod
from typing import AsyncIterator, Optional
from dataclasses import dataclass


@dataclass
class ProviderConfig:
    """Configuration for AI provider."""
    api_key: Optional[str] = None
    model: str = ""
    base_url: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 4096


@dataclass
class ChatMessage:
    """A chat message."""
    role: str  # "user", "assistant", "system"
    content: str


class BaseProvider(ABC):
    """Abstract base class for AI providers."""

    def __init__(self, config: ProviderConfig):
        self.config = config

    @abstractmethod
    async def chat(
        self,
        messages: list[ChatMessage],
        system_prompt: Optional[str] = None,
    ) -> str:
        """Send messages and get response."""
        pass

    @abstractmethod
    async def chat_stream(
        self,
        messages: list[ChatMessage],
        system_prompt: Optional[str] = None,
    ) -> AsyncIterator[str]:
        """Send messages and stream response."""
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        """Check if provider is properly configured."""
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name."""
        pass
