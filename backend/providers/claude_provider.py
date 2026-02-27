"""
Anthropic Claude Provider

Supports Claude 3 Opus, Sonnet, Haiku, etc.
"""

from typing import AsyncIterator, Optional
from anthropic import AsyncAnthropic

from .base import BaseProvider, ProviderConfig, ChatMessage


class ClaudeProvider(BaseProvider):
    """Anthropic Claude API provider."""

    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        self.client: Optional[AsyncAnthropic] = None
        if config.api_key:
            self.client = AsyncAnthropic(api_key=config.api_key)

    @property
    def name(self) -> str:
        return "claude"

    def is_configured(self) -> bool:
        return self.client is not None and bool(self.config.api_key)

    async def chat(
        self,
        messages: list[ChatMessage],
        system_prompt: Optional[str] = None,
    ) -> str:
        if not self.client:
            raise ValueError("Claude client not configured")

        formatted_messages = self._format_messages(messages)

        response = await self.client.messages.create(
            model=self.config.model or "claude-3-opus-20240229",
            max_tokens=self.config.max_tokens,
            system=system_prompt or "",
            messages=formatted_messages,
        )

        return response.content[0].text if response.content else ""

    async def chat_stream(
        self,
        messages: list[ChatMessage],
        system_prompt: Optional[str] = None,
    ) -> AsyncIterator[str]:
        if not self.client:
            raise ValueError("Claude client not configured")

        formatted_messages = self._format_messages(messages)

        async with self.client.messages.stream(
            model=self.config.model or "claude-3-opus-20240229",
            max_tokens=self.config.max_tokens,
            system=system_prompt or "",
            messages=formatted_messages,
        ) as stream:
            async for text in stream.text_stream:
                yield text

    def _format_messages(self, messages: list[ChatMessage]) -> list[dict]:
        formatted = []

        for msg in messages:
            # Claude uses "user" and "assistant" roles
            role = msg.role
            if role == "system":
                # System messages should be passed via system parameter
                continue
            formatted.append({"role": role, "content": msg.content})

        return formatted
