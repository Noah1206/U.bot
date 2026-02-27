import type { Message } from '@/types';

interface UserMessageProps {
  message: Message;
}

export function UserMessage({ message }: UserMessageProps) {
  return (
    <div className="flex justify-end">
      <div className="message-user max-w-[80%]">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </div>
            <div className="mt-2 text-[10px] text-text-muted text-right">
              {formatTime(message.timestamp)}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-accent-pink/20 flex items-center justify-center flex-shrink-0">
            <span className="text-sm">👤</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
