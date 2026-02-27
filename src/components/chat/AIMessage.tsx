import { useAIStore } from '@/stores/aiStore';
import { CodeBlock } from './CodeBlock';
import type { Message } from '@/types';

interface AIMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export function AIMessage({ message, isStreaming = false }: AIMessageProps) {
  const { agents } = useAIStore();

  const agent = message.agentId
    ? agents.find((a) => a.id === message.agentId)
    : null;

  const agentColor = agent?.color || '#3b82f6';
  const agentName = agent?.name || 'AI';
  const agentRole = agent?.role || 'assistant';

  // Parse content for code blocks
  const contentParts = parseContent(message.content);

  return (
    <div className="flex justify-start">
      <div className="message-ai max-w-[80%]">
        <div className="flex items-start gap-3">
          {/* Agent avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${agentColor}20` }}
          >
            <AgentIcon role={agentRole} />
          </div>

          <div className="flex-1 min-w-0">
            {/* Agent info */}
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-sm font-medium"
                style={{ color: agentColor }}
              >
                {agentName}
              </span>
              <span className="text-[10px] text-text-muted uppercase">
                {agentRole}
              </span>
              {message.metadata?.round && (
                <span className="text-[10px] bg-accent-blue/20 text-accent-blue px-1.5 py-0.5 rounded">
                  R{message.metadata.round}
                </span>
              )}
              {message.metadata?.stability !== undefined && (
                <span className="text-[10px] bg-accent-green/20 text-accent-green px-1.5 py-0.5 rounded">
                  {(message.metadata.stability * 100).toFixed(0)}%
                </span>
              )}
            </div>

            {/* Content */}
            <div className="text-sm space-y-2">
              {contentParts.map((part, index) => {
                if (part.type === 'code') {
                  return (
                    <CodeBlock
                      key={index}
                      code={part.content}
                      language={part.language}
                    />
                  );
                }
                return (
                  <div
                    key={index}
                    className="whitespace-pre-wrap break-words"
                  >
                    {part.content}
                  </div>
                );
              })}

              {/* Streaming indicator */}
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-accent-blue animate-pulse" />
              )}
            </div>

            {/* Timestamp */}
            <div className="mt-2 text-[10px] text-text-muted">
              {formatTime(message.timestamp)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentIcon({ role }: { role: string }) {
  const icons: Record<string, string> = {
    planner: '🏗️',
    critic: '🔍',
    researcher: '📚',
    assistant: '🤖',
  };
  return <span className="text-sm">{icons[role] || '🤖'}</span>;
}

interface ContentPart {
  type: 'text' | 'code';
  content: string;
  language?: string;
}

function parseContent(content: string): ContentPart[] {
  const parts: ContentPart[] = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim();
      if (text) {
        parts.push({ type: 'text', content: text });
      }
    }

    // Add code block
    parts.push({
      type: 'code',
      content: match[2].trim(),
      language: match[1] || 'text',
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim();
    if (text) {
      parts.push({ type: 'text', content: text });
    }
  }

  // If no parts found, return original content as text
  if (parts.length === 0 && content.trim()) {
    parts.push({ type: 'text', content: content.trim() });
  }

  return parts;
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
