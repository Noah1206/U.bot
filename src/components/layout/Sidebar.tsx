import { useAIStore } from '@/stores/aiStore';
import { useAppStore } from '@/stores/appStore';
import type { AIAgent, ActivityLog, ExecutionResult } from '@/types';

export function Sidebar() {
  const { agents, lastResult, activityLogs } = useAIStore();
  const { isSidebarCollapsed, toggleSidebar } = useAppStore();

  if (isSidebarCollapsed) {
    return (
      <div className="w-12 bg-app-sidebar border-r border-app-border flex flex-col items-center py-4">
        <button
          onClick={toggleSidebar}
          className="text-text-muted hover:text-text-primary transition-colors"
        >
          →
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 bg-app-sidebar border-r border-app-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-app-border flex items-center justify-between">
        <h2 className="pixel-text text-xs text-accent-cyan">CONTROL</h2>
        <button
          onClick={toggleSidebar}
          className="text-text-muted hover:text-text-primary transition-colors text-sm"
        >
          ←
        </button>
      </div>

      {/* MY AI Section */}
      <div className="p-4 border-b border-app-border">
        <h3 className="pixel-text text-[10px] text-text-muted mb-3">MY AI</h3>
        <div className="space-y-2">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>

      {/* EXECUTION RESULT Section */}
      <div className="p-4 border-b border-app-border flex-1 overflow-hidden flex flex-col">
        <h3 className="pixel-text text-[10px] text-text-muted mb-3">EXECUTION RESULT</h3>
        <div className="flex-1 overflow-auto">
          {lastResult ? (
            <ExecutionResultCard result={lastResult} />
          ) : (
            <div className="text-text-muted text-xs">No results yet</div>
          )}
        </div>
      </div>

      {/* RECENT ACTIVITY Section */}
      <div className="p-4 flex-1 overflow-hidden flex flex-col">
        <h3 className="pixel-text text-[10px] text-text-muted mb-3">RECENT ACTIVITY</h3>
        <div className="flex-1 overflow-auto space-y-2">
          {activityLogs.slice(-10).reverse().map((log) => (
            <ActivityLogItem key={log.id} log={log} />
          ))}
          {activityLogs.length === 0 && (
            <div className="text-text-muted text-xs">No activity yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

function AgentCard({ agent }: { agent: AIAgent }) {
  const statusColors = {
    idle: 'bg-accent-yellow',
    thinking: 'bg-accent-blue animate-pulse',
    responding: 'bg-accent-green animate-pulse',
    error: 'bg-accent-red',
  };

  return (
    <div
      className="bg-app-card rounded-lg p-3 border border-app-border hover:border-accent-blue/50 transition-colors cursor-pointer"
      style={{ borderLeftColor: agent.color, borderLeftWidth: '3px' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`status-dot ${statusColors[agent.status]}`} />
          <span className="text-sm font-medium">{agent.name}</span>
        </div>
        <span className="text-[10px] text-text-muted uppercase">{agent.role}</span>
      </div>
      <div className="mt-1 text-[10px] text-text-muted">
        {agent.model}
      </div>
    </div>
  );
}

function ExecutionResultCard({ result }: { result: ExecutionResult }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={`status-dot ${result.success ? 'status-active' : 'status-error'}`} />
        <span className="text-sm">{result.success ? 'Success' : 'Failed'}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-app-card p-2 rounded">
          <div className="text-text-muted">Round</div>
          <div className="font-mono">{result.round}</div>
        </div>
        <div className="bg-app-card p-2 rounded">
          <div className="text-text-muted">Stability</div>
          <div className="font-mono">{(result.stability * 100).toFixed(1)}%</div>
        </div>
      </div>

      {result.termination_reason && (
        <div className="bg-app-card p-2 rounded text-xs">
          <div className="text-text-muted">Reason</div>
          <div className="text-accent-cyan">{result.termination_reason}</div>
        </div>
      )}

      <div className="bg-black/30 rounded p-2 text-xs font-mono max-h-32 overflow-auto whitespace-pre-wrap">
        {result.output.slice(0, 500)}
        {result.output.length > 500 && '...'}
      </div>
    </div>
  );
}

function ActivityLogItem({ log }: { log: ActivityLog }) {
  const typeIcons: Record<string, string> = {
    round_start: '🔄',
    evaluation: '📊',
    decision: '🎯',
    termination: '✅',
    error: '❌',
  };

  const typeColors: Record<string, string> = {
    round_start: 'text-accent-blue',
    evaluation: 'text-accent-purple',
    decision: 'text-accent-cyan',
    termination: 'text-accent-green',
    error: 'text-accent-red',
  };

  return (
    <div className="text-xs flex items-start gap-2">
      <span>{typeIcons[log.type] || '•'}</span>
      <div className="flex-1 min-w-0">
        <div className={`truncate ${typeColors[log.type] || 'text-text-secondary'}`}>
          {log.message}
        </div>
        <div className="text-text-muted text-[10px]">
          {formatTime(log.timestamp)}
        </div>
      </div>
    </div>
  );
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
