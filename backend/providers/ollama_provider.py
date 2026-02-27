"""
Ollama Provider

Supports local LLM models via Ollama.
"""

from typing import AsyncIterator, Optional
import httpx

from .base import BaseProvider, ProviderConfig, ChatMessage


class OllamaProvider(BaseProvider):
    """Ollama local LLM provider."""

    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        self.base_url = config.base_url or "http://localhost:11434"
        self._configured = True  # Ollama doesn't need API key

    @property
    def name(self) -> str:
        return "ollama"

    def is_configured(self) -> bool:
        return self._configured

    async def chat(
        self,
        messages: list[ChatMessage],
        system_prompt: Optional[str] = None,
    ) -> str:
        formatted_messages = self._format_messages(messages, system_prompt)

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": self.config.model or "llama2",
                    "messages": formatted_messages,
                    "stream": False,
                    "options": {
                        "temperature": self.config.temperature,
                        "num_predict": self.config.max_tokens,
                    },
                },
                timeout=120.0,
            )
            response.raise_for_status()
            data = response.json()
            return data.get("message", {}).get("content", "")

    async def chat_stream(
        self,
        messages: list[ChatMessage],
        system_prompt: Optional[str] = None,
    ) -> AsyncIterator[str]:
        formatted_messages = self._format_messages(messages, system_prompt)

        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/api/chat",
                json={
                    "model": self.config.model or "llama2",
                    "messages": formatted_messages,
                    "stream": True,
                    "options": {
                        "temperature": self.config.temperature,
                        "num_predict": self.config.max_tokens,
                    },
                },
                timeout=120.0,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line:
                        import json
                        data = json.loads(line)
                        if content := data.get("message", {}).get("content"):
                            yield content

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
