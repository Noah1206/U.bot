/**
 * AI Provider Service
 *
 * WebSocket-based communication with Python backend.
 * Supports multiple AI providers: OpenAI, Claude, Gemini, Ollama
 */

import type { AIProvider, WSMessage, WSRequest, WSResponse } from '@/types';

export interface ProviderConfig {
  provider: AIProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface StreamCallback {
  onToken: (token: string) => void;
  onComplete: (fullResponse: string) => void;
  onError: (error: string) => void;
}

class AIProviderService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageQueue: WSRequest[] = [];
  private pendingCallbacks: Map<string, StreamCallback> = new Map();
  private connectionPromise: Promise<void> | null = null;
  private onConnectionChange?: (connected: boolean) => void;

  private wsUrl = 'ws://localhost:8000/ws';

  /**
   * Sets the WebSocket URL.
   */
  setWsUrl(url: string): void {
    this.wsUrl = url;
  }

  /**
   * Connects to the WebSocket server.
   */
  async connect(onConnectionChange?: (connected: boolean) => void): Promise<void> {
    this.onConnectionChange = onConnectionChange;

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.onConnectionChange?.(true);
          this.flushMessageQueue();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.onConnectionChange?.(false);
          this.connectionPromise = null;
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  /**
   * Attempts to reconnect after disconnection.
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      console.log(`Reconnection attempt ${this.reconnectAttempts}...`);
      this.connect(this.onConnectionChange);
    }, delay);
  }

  /**
   * Handles incoming WebSocket messages.
   */
  private handleMessage(data: string): void {
    try {
      const message: WSMessage = JSON.parse(data);

      switch (message.type) {
        case 'stream': {
          const { request_id, token } = message.payload as {
            request_id: string;
            token: string;
          };
          const callback = this.pendingCallbacks.get(request_id);
          callback?.onToken(token);
          break;
        }

        case 'response': {
          const { request_id, content, success } = message.payload as {
            request_id: string;
            content: string;
            success: boolean;
          };
          const callback = this.pendingCallbacks.get(request_id);
          if (success) {
            callback?.onComplete(content);
          } else {
            callback?.onError(content);
          }
          this.pendingCallbacks.delete(request_id);
          break;
        }

        case 'error': {
          const { request_id, error } = message.payload as {
            request_id: string;
            error: string;
          };
          const callback = this.pendingCallbacks.get(request_id);
          callback?.onError(error);
          this.pendingCallbacks.delete(request_id);
          break;
        }
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Sends a request through WebSocket.
   */
  private send(request: WSRequest): string {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const message = {
      ...request,
      request_id: requestId,
      timestamp: new Date().toISOString(),
    };

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(request);
    }

    return requestId;
  }

  /**
   * Flushes queued messages after reconnection.
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const request = this.messageQueue.shift();
      if (request) {
        this.send(request);
      }
    }
  }

  /**
   * Sends a chat message and returns streaming response.
   */
  async chat(
    prompt: string,
    config: ProviderConfig,
    callbacks: StreamCallback
  ): Promise<string> {
    await this.connect(this.onConnectionChange);

    const requestId = this.send({
      action: 'chat',
      data: {
        prompt,
        provider: config.provider,
        model: config.model,
        api_key: config.apiKey,
        base_url: config.baseUrl,
      },
    });

    this.pendingCallbacks.set(requestId, callbacks);

    return new Promise((resolve, reject) => {
      const originalOnComplete = callbacks.onComplete;
      const originalOnError = callbacks.onError;

      callbacks.onComplete = (response) => {
        originalOnComplete(response);
        resolve(response);
      };

      callbacks.onError = (error) => {
        originalOnError(error);
        reject(new Error(error));
      };
    });
  }

  /**
   * Simple chat without streaming (waits for complete response).
   */
  async chatSimple(prompt: string, config: ProviderConfig): Promise<string> {
    let fullResponse = '';

    return this.chat(prompt, config, {
      onToken: (token) => {
        fullResponse += token;
      },
      onComplete: () => {},
      onError: () => {},
    });
  }

  /**
   * Configures API keys on the server.
   */
  async configureApiKeys(keys: Partial<Record<AIProvider, string>>): Promise<void> {
    await this.connect(this.onConnectionChange);

    this.send({
      action: 'configure',
      data: { api_keys: keys },
    });
  }

  /**
   * Tests connection to a specific provider.
   */
  async testProvider(provider: AIProvider): Promise<boolean> {
    try {
      const response = await this.chatSimple('Hello', {
        provider,
        model: this.getDefaultModel(provider),
      });
      return response.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Gets default model for a provider.
   */
  private getDefaultModel(provider: AIProvider): string {
    const defaults: Record<AIProvider, string> = {
      openai: 'gpt-4o',
      claude: 'claude-3-opus-20240229',
      gemini: 'gemini-pro',
      ollama: 'llama2',
    };
    return defaults[provider];
  }

  /**
   * Disconnects WebSocket.
   */
  disconnect(): void {
    this.ws?.close();
    this.ws = null;
    this.connectionPromise = null;
  }

  /**
   * Checks if connected.
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
export const aiProviderService = new AIProviderService();

/**
 * Creates a simple AI provider function for the orchestrator.
 */
export function createAIProviderFunction(config: ProviderConfig): (prompt: string) => Promise<string> {
  return async (prompt: string) => {
    return aiProviderService.chatSimple(prompt, config);
  };
}
