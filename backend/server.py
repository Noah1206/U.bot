"""
AI Life Layer Backend Server

FastAPI WebSocket server for AI provider integration.
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from providers import (
    BaseProvider,
    ProviderConfig,
    ChatMessage,
    OpenAIProvider,
    ClaudeProvider,
    GeminiProvider,
    OllamaProvider,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Global state
class AppState:
    def __init__(self):
        self.api_keys: dict[str, str] = {}
        self.providers: dict[str, BaseProvider] = {}
        self.active_connections: list[WebSocket] = []

    def get_provider(self, provider_name: str, config: ProviderConfig) -> BaseProvider:
        """Get or create a provider instance."""
        providers_map = {
            "openai": OpenAIProvider,
            "claude": ClaudeProvider,
            "gemini": GeminiProvider,
            "ollama": OllamaProvider,
        }

        provider_class = providers_map.get(provider_name)
        if not provider_class:
            raise ValueError(f"Unknown provider: {provider_name}")

        return provider_class(config)


app_state = AppState()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    logger.info("AI Life Layer Backend starting...")
    yield
    logger.info("AI Life Layer Backend shutting down...")


app = FastAPI(
    title="AI Life Layer Backend",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models
class ConfigureRequest(BaseModel):
    api_keys: dict[str, str]


class ChatRequest(BaseModel):
    prompt: str
    provider: str = "openai"
    model: str = "gpt-4o"
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    system_prompt: Optional[str] = None
    stream: bool = True


# REST endpoints
@app.get("/")
async def root():
    return {"status": "ok", "service": "AI Life Layer Backend"}


@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


@app.post("/configure")
async def configure(request: ConfigureRequest):
    """Configure API keys."""
    app_state.api_keys.update(request.api_keys)
    return {"status": "ok", "configured": list(request.api_keys.keys())}


# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    app_state.active_connections.append(websocket)
    logger.info(f"Client connected. Total connections: {len(app_state.active_connections)}")

    try:
        while True:
            data = await websocket.receive_text()
            await handle_websocket_message(websocket, data)
    except WebSocketDisconnect:
        app_state.active_connections.remove(websocket)
        logger.info(f"Client disconnected. Total connections: {len(app_state.active_connections)}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        if websocket in app_state.active_connections:
            app_state.active_connections.remove(websocket)


async def handle_websocket_message(websocket: WebSocket, data: str):
    """Handle incoming WebSocket messages."""
    try:
        message = json.loads(data)
        action = message.get("action")
        request_id = message.get("request_id", "unknown")

        if action == "chat":
            await handle_chat(websocket, message, request_id)
        elif action == "configure":
            await handle_configure(websocket, message, request_id)
        else:
            await send_error(websocket, request_id, f"Unknown action: {action}")

    except json.JSONDecodeError as e:
        await send_error(websocket, "unknown", f"Invalid JSON: {e}")
    except Exception as e:
        logger.error(f"Error handling message: {e}")
        await send_error(websocket, "unknown", str(e))


async def handle_chat(websocket: WebSocket, message: dict, request_id: str):
    """Handle chat request."""
    try:
        data = message.get("data", {})
        prompt = data.get("prompt", "")
        provider_name = data.get("provider", "openai")
        model = data.get("model", "gpt-4o")
        api_key = data.get("api_key") or app_state.api_keys.get(provider_name)
        base_url = data.get("base_url")
        system_prompt = data.get("system_prompt")

        if not prompt:
            await send_error(websocket, request_id, "No prompt provided")
            return

        config = ProviderConfig(
            api_key=api_key,
            model=model,
            base_url=base_url,
        )

        provider = app_state.get_provider(provider_name, config)

        if not provider.is_configured() and provider_name != "ollama":
            await send_error(
                websocket,
                request_id,
                f"Provider {provider_name} not configured. Please provide API key.",
            )
            return

        messages = [ChatMessage(role="user", content=prompt)]
        full_response = ""

        # Stream response
        async for token in provider.chat_stream(messages, system_prompt):
            full_response += token
            await websocket.send_json({
                "type": "stream",
                "payload": {
                    "request_id": request_id,
                    "token": token,
                },
                "timestamp": datetime.utcnow().isoformat(),
            })

        # Send completion
        await websocket.send_json({
            "type": "response",
            "payload": {
                "request_id": request_id,
                "content": full_response,
                "success": True,
            },
            "timestamp": datetime.utcnow().isoformat(),
        })

    except Exception as e:
        logger.error(f"Chat error: {e}")
        await send_error(websocket, request_id, str(e))


async def handle_configure(websocket: WebSocket, message: dict, request_id: str):
    """Handle configuration request."""
    try:
        data = message.get("data", {})
        api_keys = data.get("api_keys", {})
        app_state.api_keys.update(api_keys)

        await websocket.send_json({
            "type": "response",
            "payload": {
                "request_id": request_id,
                "success": True,
                "configured": list(api_keys.keys()),
            },
            "timestamp": datetime.utcnow().isoformat(),
        })

    except Exception as e:
        await send_error(websocket, request_id, str(e))


async def send_error(websocket: WebSocket, request_id: str, error: str):
    """Send error response."""
    await websocket.send_json({
        "type": "error",
        "payload": {
            "request_id": request_id,
            "error": error,
        },
        "timestamp": datetime.utcnow().isoformat(),
    })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
