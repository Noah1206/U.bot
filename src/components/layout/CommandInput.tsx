import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useAppStore } from '@/stores/appStore';
import { useAIStore } from '@/stores/aiStore';
import { aiProviderService, createAIProviderFunction } from '@/services/api/aiProvider';
import { createOrchestrator } from '@/services/ai/orchestrator';

export function CommandInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    inputValue,
    setInputValue,
    addMessage,
    isStreaming,
    setStreaming,
    appendToStreamingMessage,
    addToHistory,
    navigateHistory,
  } = useChatStore();
  const { settings, isConnected } = useAppStore();
  const { addActivityLog, setLastResult, updateAgentStatus, agents } = useAIStore();

  const [isOrchestrating, setIsOrchestrating] = useState(false);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || isStreaming) return;

    // Add to history
    addToHistory(trimmedInput);

    // Add user message
    addMessage({
      type: 'user',
      content: trimmedInput,
    });

    // Clear input
    setInputValue('');

    // Check for orchestration command
    if (trimmedInput.startsWith('/orchestrate ') || trimmedInput.startsWith('/o ')) {
      const goal = trimmedInput.replace(/^\/(orchestrate|o)\s+/, '');
      await runOrchestration(goal);
      return;
    }

    // Regular chat
    await sendChat(trimmedInput);
  };

  const sendChat = async (message: string) => {
    setStreaming(true);

    // Add placeholder AI message
    addMessage({
      type: 'ai',
      content: '',
      agentId: 'planner',
    });

    // Update agent status
    updateAgentStatus('planner', 'thinking');

    try {
      const providerConfig = {
        provider: settings.defaultProvider,
        model: 'gpt-4o',
        apiKey: settings.apiKeys[settings.defaultProvider],
      };

      await aiProviderService.chat(message, providerConfig, {
        onToken: (token) => {
          appendToStreamingMessage(token);
        },
        onComplete: (response) => {
          setStreaming(false);
          updateAgentStatus('planner', 'idle');
          addActivityLog({
            type: 'evaluation',
            message: `Response received (${response.length} chars)`,
          });
        },
        onError: (error) => {
          setStreaming(false);
          updateAgentStatus('planner', 'error');
          addMessage({
            type: 'system',
            content: `Error: ${error}`,
          });
        },
      });
    } catch (error) {
      setStreaming(false);
      updateAgentStatus('planner', 'error');

      // Fallback: simulate response for demo
      addMessage({
        type: 'ai',
        content: `[Demo Mode] I received your message: "${message}"\n\nTo enable real AI responses, please:\n1. Start the Python backend server\n2. Configure your API keys in settings`,
        agentId: 'planner',
      });
      updateAgentStatus('planner', 'idle');
    }
  };

  const runOrchestration = async (goal: string) => {
    setIsOrchestrating(true);
    setStreaming(true);

    addMessage({
      type: 'system',
      content: `🚀 Starting orchestration for: ${goal}`,
    });

    addActivityLog({
      type: 'round_start',
      message: `Orchestration started: ${goal}`,
    });

    try {
      const providerConfig = {
        provider: settings.defaultProvider,
        model: 'gpt-4o',
        apiKey: settings.apiKeys[settings.defaultProvider],
      };

      const aiProvider = createAIProviderFunction(providerConfig);

      const orchestrator = createOrchestrator(aiProvider, {
        maxRounds: settings.maxRounds,
        stabilityThreshold: settings.stabilityThreshold,
        onRoundStart: (round) => {
          addActivityLog({
            type: 'round_start',
            message: `Round ${round} started`,
          });
          addMessage({
            type: 'system',
            content: `📍 Round ${round} started`,
          });
        },
        onRoundComplete: (result) => {
          addActivityLog({
            type: 'evaluation',
            message: `Round ${result.round} complete - Stability: ${(result.stability.overall_stability * 100).toFixed(1)}%`,
          });
        },
        onTerminate: (result) => {
          setLastResult(result);
          addActivityLog({
            type: 'termination',
            message: `Orchestration terminated: ${result.termination_reason}`,
          });
        },
        onLog: (log) => {
          addActivityLog(log);
        },
      });

      const result = await orchestrator.execute(goal);

      addMessage({
        type: 'ai',
        content: result.output,
        agentId: 'planner',
        metadata: {
          round: result.round,
          stability: result.stability,
        },
      });
    } catch (error) {
      addMessage({
        type: 'system',
        content: `❌ Orchestration failed: ${error}`,
      });
      addActivityLog({
        type: 'error',
        message: `Orchestration error: ${error}`,
      });
    } finally {
      setIsOrchestrating(false);
      setStreaming(false);
      agents.forEach((agent) => updateAgentStatus(agent.id, 'idle'));
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const command = navigateHistory('up');
      if (command) setInputValue(command);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const command = navigateHistory('down');
      if (command) setInputValue(command);
    }
  };

  return (
    <div className="h-16 bg-app-sidebar border-t border-app-border px-4 flex items-center gap-3">
      {/* Status indicator */}
      <div className="flex items-center gap-2">
        {isOrchestrating && (
          <span className="text-accent-purple animate-pulse text-sm">🔄</span>
        )}
        {isStreaming && !isOrchestrating && (
          <span className="text-accent-blue animate-pulse text-sm">💭</span>
        )}
      </div>

      {/* Input field */}
      <div className="flex-1 relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isOrchestrating
              ? 'Orchestrating...'
              : isStreaming
              ? 'Waiting for response...'
              : 'Type command... (/orchestrate <goal> for AI orchestration)'
          }
          disabled={isStreaming}
          className="w-full input-field pr-20"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted text-xs">
          {inputValue.length > 0 && `${inputValue.length}`}
        </div>
      </div>

      {/* Send button */}
      <button
        onClick={handleSubmit}
        disabled={!inputValue.trim() || isStreaming}
        className={`
          btn-primary px-6 flex items-center gap-2
          ${(!inputValue.trim() || isStreaming) && 'opacity-50 cursor-not-allowed'}
        `}
      >
        <span>Send</span>
        <span className="text-xs opacity-70">↵</span>
      </button>

      {/* Connection indicator */}
      {!isConnected && (
        <div className="text-accent-yellow text-xs flex items-center gap-1">
          <span>⚠️</span>
          <span>Offline</span>
        </div>
      )}
    </div>
  );
}
