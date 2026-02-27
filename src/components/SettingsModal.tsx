import { useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import type { AIProvider } from '@/types';

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { settings, updateSettings, setApiKey } = useAppStore();
  const [activeTab, setActiveTab] = useState<'api' | 'general'>('api');

  const providers: { id: AIProvider; name: string; placeholder: string }[] = [
    { id: 'openai', name: 'OpenAI', placeholder: 'sk-...' },
    { id: 'claude', name: 'Anthropic (Claude)', placeholder: 'sk-ant-...' },
    { id: 'gemini', name: 'Google (Gemini)', placeholder: 'AIza...' },
    { id: 'ollama', name: 'Ollama (Local)', placeholder: 'http://localhost:11434' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-app-sidebar border border-app-border rounded-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-app-border">
          <h2 className="pixel-text text-sm text-gradient">SETTINGS</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors text-xl"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-app-border">
          <TabButton
            active={activeTab === 'api'}
            onClick={() => setActiveTab('api')}
          >
            API Keys
          </TabButton>
          <TabButton
            active={activeTab === 'general'}
            onClick={() => setActiveTab('general')}
          >
            General
          </TabButton>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {activeTab === 'api' && (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary mb-4">
                Configure your AI provider API keys. Keys are stored locally.
              </p>

              {providers.map((provider) => (
                <div key={provider.id}>
                  <label className="block text-sm text-text-secondary mb-1">
                    {provider.name}
                  </label>
                  <input
                    type="password"
                    value={settings.apiKeys[provider.id] || ''}
                    onChange={(e) => setApiKey(provider.id, e.target.value)}
                    placeholder={provider.placeholder}
                    className="input-field w-full text-sm"
                  />
                </div>
              ))}

              {/* Default provider */}
              <div>
                <label className="block text-sm text-text-secondary mb-1">
                  Default Provider
                </label>
                <select
                  value={settings.defaultProvider}
                  onChange={(e) =>
                    updateSettings({ defaultProvider: e.target.value as AIProvider })
                  }
                  className="input-field w-full text-sm"
                >
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-4">
              {/* Max Rounds */}
              <div>
                <label className="block text-sm text-text-secondary mb-1">
                  Max Orchestration Rounds
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.maxRounds}
                  onChange={(e) =>
                    updateSettings({ maxRounds: parseInt(e.target.value) || 3 })
                  }
                  className="input-field w-full text-sm"
                />
                <p className="text-xs text-text-muted mt-1">
                  Hard limit for orchestration rounds (default: 3)
                </p>
              </div>

              {/* Stability Threshold */}
              <div>
                <label className="block text-sm text-text-secondary mb-1">
                  Stability Threshold
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0.5"
                    max="0.95"
                    step="0.05"
                    value={settings.stabilityThreshold}
                    onChange={(e) =>
                      updateSettings({
                        stabilityThreshold: parseFloat(e.target.value),
                      })
                    }
                    className="flex-1"
                  />
                  <span className="text-sm font-mono w-12">
                    {(settings.stabilityThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-1">
                  Auto-terminate when stability exceeds this threshold
                </p>
              </div>

              {/* Theme (future) */}
              <div className="opacity-50">
                <label className="block text-sm text-text-secondary mb-1">
                  Theme
                </label>
                <select disabled className="input-field w-full text-sm">
                  <option value="dark">Dark (Only option for now)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-app-border">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm transition-colors border-b-2 ${
        active
          ? 'text-accent-blue border-accent-blue'
          : 'text-text-muted border-transparent hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  );
}
