import { MessageList } from './MessageList';

export function ChatView() {
  return (
    <div className="flex-1 flex flex-col bg-app-main overflow-hidden">
      <MessageList />
    </div>
  );
}
