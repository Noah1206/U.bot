import { create } from 'zustand';
import type { Message } from '@/types';

interface ChatState {
  // Messages
  messages: Message[];
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;

  // Input
  inputValue: string;
  setInputValue: (value: string) => void;

  // Streaming state
  isStreaming: boolean;
  setStreaming: (streaming: boolean) => void;
  streamingMessageId: string | null;
  appendToStreamingMessage: (content: string) => void;

  // Command history
  commandHistory: string[];
  historyIndex: number;
  addToHistory: (command: string) => void;
  navigateHistory: (direction: 'up' | 'down') => string | null;
}

const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export const useChatStore = create<ChatState>((set, get) => ({
  // Messages
  messages: [],
  addMessage: (message) => {
    const newMessage: Message = {
      ...message,
      id: generateId(),
      timestamp: new Date(),
    };
    set((state) => ({
      messages: [...state.messages, newMessage],
      streamingMessageId: message.type === 'ai' ? newMessage.id : state.streamingMessageId,
    }));
    return newMessage.id;
  },
  clearMessages: () => set({ messages: [] }),

  // Input
  inputValue: '',
  setInputValue: (value) => set({ inputValue: value }),

  // Streaming state
  isStreaming: false,
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  streamingMessageId: null,
  appendToStreamingMessage: (content) => {
    const { streamingMessageId, messages } = get();
    if (!streamingMessageId) return;

    set({
      messages: messages.map((msg) =>
        msg.id === streamingMessageId
          ? { ...msg, content: msg.content + content }
          : msg
      ),
    });
  },

  // Command history
  commandHistory: [],
  historyIndex: -1,
  addToHistory: (command) => {
    if (!command.trim()) return;
    set((state) => ({
      commandHistory: [...state.commandHistory, command].slice(-50), // Keep last 50
      historyIndex: -1,
    }));
  },
  navigateHistory: (direction) => {
    const { commandHistory, historyIndex } = get();
    if (commandHistory.length === 0) return null;

    let newIndex: number;
    if (direction === 'up') {
      newIndex = historyIndex === -1
        ? commandHistory.length - 1
        : Math.max(0, historyIndex - 1);
    } else {
      newIndex = historyIndex === -1
        ? -1
        : Math.min(commandHistory.length - 1, historyIndex + 1);
    }

    set({ historyIndex: newIndex });
    return newIndex >= 0 ? commandHistory[newIndex] : null;
  },
}));
