import { useAppStore } from '@/stores/appStore';
import { useAIStore } from '@/stores/aiStore';
import type { ViewType } from '@/types';

export function Header() {
  const { currentView, setCurrentView, isConnected, setSettingsOpen } = useAppStore();
  const { currentRound } = useAIStore();

  return (
    <header className="h-14 bg-app-sidebar border-b border-app-border flex items-center justify-between px-4">
      {/* Left: View Toggle */}
      <div className="flex items-center gap-2">
        <ViewToggleButton
          view="game"
          currentView={currentView}
          onClick={() => setCurrentView('game')}
          icon="🎮"
          label="Game"
        />
        <ViewToggleButton
          view="chat"
          currentView={currentView}
          onClick={() => setCurrentView('chat')}
          icon="💬"
          label="Chat"
        />
      </div>

      {/* Center: Title & Status */}
      <div className="flex items-center gap-4">
        <h1 className="pixel-text text-sm text-gradient">AI LIFE LAYER</h1>

        {currentRound.number > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-muted">Round</span>
            <span className="bg-accent-blue/20 text-accent-blue px-2 py-0.5 rounded">
              {currentRound.number}
            </span>
            <span className="text-text-muted">•</span>
            <span
              className={
                currentRound.phase === 'ARCHITECT'
                  ? 'text-accent-purple'
                  : 'text-accent-cyan'
              }
            >
              {currentRound.phase}
            </span>
          </div>
        )}
      </div>

      {/* Right: Status & Settings */}
      <div className="flex items-center gap-4">
        {/* Connection Status */}
        <div className="flex items-center gap-2 text-xs">
          <div
            className={`status-dot ${isConnected ? 'status-active' : 'status-error'}`}
          />
          <span className="text-text-muted">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Stability Indicator */}
        {currentRound.stability && (
          <StabilityBadge stability={currentRound.stability.overall_stability} />
        )}

        {/* Settings Button */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="p-2 hover:bg-app-card rounded-lg transition-colors text-text-muted hover:text-text-primary"
        >
          ⚙️
        </button>
      </div>
    </header>
  );
}

interface ViewToggleButtonProps {
  view: ViewType;
  currentView: ViewType;
  onClick: () => void;
  icon: string;
  label: string;
}

function ViewToggleButton({
  view,
  currentView,
  onClick,
  icon,
  label,
}: ViewToggleButtonProps) {
  const isActive = view === currentView;

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all duration-200
        ${
          isActive
            ? 'bg-accent-blue text-white'
            : 'bg-app-card text-text-secondary hover:bg-app-border hover:text-text-primary'
        }
      `}
    >
      <span>{icon}</span>
      <span className="pixel-text text-[10px]">{label}</span>
    </button>
  );
}

function StabilityBadge({ stability }: { stability: number }) {
  const percentage = (stability * 100).toFixed(0);
  let color = 'text-accent-red';
  let bgColor = 'bg-accent-red/20';

  if (stability >= 0.85) {
    color = 'text-accent-green';
    bgColor = 'bg-accent-green/20';
  } else if (stability >= 0.7) {
    color = 'text-accent-yellow';
    bgColor = 'bg-accent-yellow/20';
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${bgColor}`}>
      <span className="text-xs text-text-muted">Stability</span>
      <span className={`text-sm font-mono ${color}`}>{percentage}%</span>
    </div>
  );
}
