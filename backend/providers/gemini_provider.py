"""
Google Gemini Provider

Supports Gemini Pro, Gemini Ultra, etc.
"""

from typing import AsyncIterator, Optional
import google.generativeai as genai

from .base import BaseProvider, ProviderConfig, ChatMessage


class GeminiProvider(BaseProvider):
    """Google Gemini API provider."""

    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        self.model = None
        if config.api_key:
            genai.configure(api_key=config.api_key)
            self.model = genai.GenerativeModel(
                config.model or "gemini-pro",
                generation_config=genai.types.GenerationConfig(
                    temperature=config.temperature,
                    max_output_tokens=config.max_tokens,
                ),
            )

    @property
    def name(self) -> str:
        return "gemini"

    def is_configured(self) -> bool:
        return self.model is not None and bool(self.config.api_key)

    async def chat(
        self,
        messages: list[ChatMessage],
        system_prompt: Optional[str] = None,
    ) -> str:
        if not self.model:
            raise ValueError("Gemini model not configured")

        # Build conversation history
        history = self._build_history(messages, system_prompt)

        chat = self.model.start_chat(history=history[:-1] if len(history) > 1 else [])

        # Send the last message
        last_message = history[-1]["parts"][0] if history else ""
        response = await chat.send_message_async(last_message)

        return response.text

    async def chat_stream(
        self,
        messages: list[ChatMessage],
        system_prompt: Optional[str] = None,
    ) -> AsyncIterator[str]:
        if not self.model:
            raise ValueError("Gemini model not configured")

        history = self._build_history(messages, system_prompt)

        chat = self.model.start_chat(history=history[:-1] if len(history) > 1 else [])

        last_message = history[-1]["parts"][0] if history else ""
        response = await chat.send_message_async(last_message, stream=True)

        async for chunk in response:
            if chunk.text:
                yield chunk.text

    def _build_history(
        self,
        messages: list[ChatMessage],
        system_prompt: Optional[str] = None,
    ) -> list[dict]:
        history = []

        # Add system prompt as first user message if provided
        if system_prompt:
            history.append({
                "role": "user",
                "parts": [f"System instructions: {system_prompt}"],
            })
            history.append({
                "role": "model",
                "parts": ["I understand. I will follow these instructions."],
            })

        for msg in messages:
            role = "user" if msg.role == "user" else "model"
            history.append({
                "role": role,
                "parts": [msg.content],
            })

        return history
