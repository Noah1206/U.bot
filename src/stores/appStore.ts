import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ViewType, AIProvider, AppSettings } from '@/types';

interface AppState {
  // View state
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  toggleView: () => void;

  // Settings
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  setApiKey: (provider: AIProvider, key: string) => void;

  // Connection state
  isConnected: boolean;
  setConnected: (connected: boolean) => void;

  // UI state
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  isSettingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
}

const defaultSettings: AppSettings = {
  theme: 'dark',
  apiKeys: {},
  defaultProvider: 'openai',
  maxRounds: 3,
  stabilityThreshold: 0.85,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // View state
      currentView: 'chat',
      setCurrentView: (view) => set({ currentView: view }),
      toggleView: () =>
        set((state) => ({
          currentView: state.currentView === 'chat' ? 'game' : 'chat',
        })),

      // Settings
      settings: defaultSettings,
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),
      setApiKey: (provider, key) =>
        set((state) => ({
          settings: {
            ...state.settings,
            apiKeys: { ...state.settings.apiKeys, [provider]: key },
          },
        })),

      // Connection state
      isConnected: false,
      setConnected: (connected) => set({ isConnected: connected }),

      // UI state
      isSidebarCollapsed: false,
      toggleSidebar: () =>
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      isSettingsOpen: false,
      setSettingsOpen: (open) => set({ isSettingsOpen: open }),
    }),
    {
      name: 'ai-life-layer-app',
      partialize: (state) => ({
        settings: state.settings,
        isSidebarCollapsed: state.isSidebarCollapsed,
      }),
    }
  )
);
