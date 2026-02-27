import { PhaserGame } from './PhaserGame';

export function GameView() {
  return (
    <div className="flex-1 bg-app-main relative overflow-hidden">
      {/* Game canvas container */}
      <PhaserGame />

      {/* Overlay UI */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
        {/* Legend */}
        <div className="bg-app-card/80 backdrop-blur-sm rounded-lg p-3 border border-app-border">
          <div className="pixel-text text-[8px] text-text-muted mb-2">AGENTS</div>
          <div className="flex gap-4 text-xs">
            <LegendItem color="#3b82f6" label="Planner" icon="🏗️" />
            <LegendItem color="#ef4444" label="Critic" icon="🔍" />
            <LegendItem color="#22c55e" label="Researcher" icon="📚" />
          </div>
        </div>

        {/* Controls hint */}
        <div className="bg-app-card/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-app-border text-[10px] text-text-muted">
          Click agents to see details • Data flows show active communication
        </div>
      </div>
    </div>
  );
}

function LegendItem({
  color,
  label,
  icon,
}: {
  color: string;
  label: string;
  icon: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
      />
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}
