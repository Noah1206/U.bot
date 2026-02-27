"""
OpenAI Provider

Supports GPT-4o, GPT-4, GPT-3.5-turbo, etc.
"""

from typing import AsyncIterator, Optional
from openai import AsyncOpenAI

from .base import BaseProvider, ProviderConfig, ChatMessage


class OpenAIProvider(BaseProvider):
    """OpenAI API provider."""

    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        self.client: Optional[AsyncOpenAI] = None
        if config.api_key:
            self.client = AsyncOpenAI(
                api_key=config.api_key,
                base_url=config.base_url,
            )

    @property
    def name(self) -> str:
        return "openai"

    def is_configured(self) -> bool:
        return self.client is not None and bool(self.config.api_key)

    async def chat(
        self,
        messages: list[ChatMessage],
        system_prompt: Optional[str] = None,
    ) -> str:
        if not self.client:
            raise ValueError("OpenAI client not configured")

        formatted_messages = self._format_messages(messages, system_prompt)

        response = await self.client.chat.completions.create(
            model=self.config.model or "gpt-4o",
            messages=formatted_messages,
            temperature=self.config.temperature,
            max_tokens=self.config.max_tokens,
        )

        return response.choices[0].message.content or ""

    async def chat_stream(
        self,
        messages: list[ChatMessage],
        system_prompt: Optional[str] = None,
    ) -> AsyncIterator[str]:
        if not self.client:
            raise ValueError("OpenAI client not configured")

        formatted_messages = self._format_messages(messages, system_prompt)

        stream = await self.client.chat.completions.create(
            model=self.config.model or "gpt-4o",
            messages=formatted_messages,
            temperature=self.config.temperature,
            max_tokens=self.config.max_tokens,
            stream=True,
        )

        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    def _format_messages(
        self,
        messages: list[ChatMessage],
        system_prompt: Optional[str] = None,
    ) -> list[dict]:
        formatted = []

        if system_prompt:
            formatted.append({"role": "system", "content": system_prompt})

        for msg in messages:
            formatted.append({"role": msg.role, "content": msg.content})

        return formatted
