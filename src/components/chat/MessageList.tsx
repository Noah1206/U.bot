import { useEffect, useRef } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { UserMessage } from './UserMessage';
import { AIMessage } from './AIMessage';
import type { Message } from '@/types';

export function MessageList() {
  const { messages, isStreaming, streamingMessageId } = useChatStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl">🤖</div>
          <h2 className="pixel-text text-lg text-gradient">AI LIFE LAYER</h2>
          <p className="text-text-secondary max-w-md">
            Welcome to the AI Life Layer orchestration system.
            <br />
            <br />
            Use <code className="bg-app-card px-2 py-1 rounded">/orchestrate &lt;goal&gt;</code> to start AI orchestration
            <br />
            or simply type a message to chat.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <QuickCommand command="/orchestrate Create a web app" />
            <QuickCommand command="/o Design a REST API" />
            <QuickCommand command="Hello!" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-4"
    >
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          isStreaming={isStreaming && message.id === streamingMessageId}
        />
      ))}
      <div ref={endRef} />
    </div>
  );
}

interface MessageItemProps {
  message: Message;
  isStreaming: boolean;
}

function MessageItem({ message, isStreaming }: MessageItemProps) {
  switch (message.type) {
    case 'user':
      return <UserMessage message={message} />;
    case 'ai':
      return <AIMessage message={message} isStreaming={isStreaming} />;
    case 'system':
      return <SystemMessage message={message} />;
    default:
      return null;
  }
}

function SystemMessage({ message }: { message: Message }) {
  return (
    <div className="flex justify-center">
      <div className="bg-app-card/50 border border-app-border rounded-lg px-4 py-2 text-sm text-text-secondary">
        {message.content}
      </div>
    </div>
  );
}

function QuickCommand({ command }: { command: string }) {
  const { setInputValue } = useChatStore();

  return (
    <button
      onClick={() => setInputValue(command)}
      className="bg-app-card border border-app-border hover:border-accent-blue/50 rounded-lg px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
    >
      {command}
    </button>
  );
}
