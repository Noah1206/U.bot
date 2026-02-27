// ============================================
// Core Types for AI Life Layer
// ============================================

// View Types
export type ViewType = 'game' | 'chat';

// AI Provider Types
export type AIProvider = 'openai' | 'claude' | 'gemini' | 'ollama';

// Round Phase Types
export type RoundPhase = 'ARCHITECT' | 'REFINER';

// Agent Types
export interface AIAgent {
  id: string;
  name: string;
  provider: AIProvider;
  model: string;
  role: 'planner' | 'critic' | 'researcher';
  status: 'idle' | 'thinking' | 'responding' | 'error';
  color: string;
}

// Message Types
export interface Message {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  agentId?: string;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  round?: number;
  phase?: RoundPhase;
  evaluationResult?: BlindEvaluation;
  stability?: number;
  tokens?: number;
}

// Blind Evaluation (Production-Hardened)
export interface BlindEvaluation {
  vs_previous: 'better' | 'same' | 'worse';
  vs_goal: 'closer' | 'same' | 'farther';
  contradictions: string[];
  missing: string[];
  risks: string[];
  // No numeric scores - prevents gaming
}

// Stability Tracking
export interface StabilityMetrics {
  contradiction_ratio: number;
  decision_reuse_rate: number;
  plan_similarity: number;
  goal_convergence: number;
  overall_stability: number;
}

// Decision Engine
export interface TerminationDecision {
  should_terminate: boolean;
  reason: TerminationReason;
  confidence: number;
}

export type TerminationReason =
  | 'stability_achieved'      // stability > 0.85
  | 'max_rounds_reached'      // round >= 3
  | 'contradiction_trend_up'  // 악화 → 중단
  | 'goal_diverging'          // vs_goal == "farther" x2
  | 'task_complete'           // missing_count == 0
  | 'continue';               // 계속 진행

// Round State
export interface RoundState {
  number: number;
  phase: RoundPhase;
  plan: Plan | null;
  evaluation: BlindEvaluation | null;
  stability: StabilityMetrics | null;
  locked_structure: LockedStructure | null;
}

export interface Plan {
  id: string;
  goals: string[];
  tasks: PlanTask[];
  constraints: string[];
  created_at: Date;
}

export interface PlanTask {
  id: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  dependencies: string[];
}

export interface LockedStructure {
  goals: string[];
  core_decisions: string[];
  locked_at_round: number;
}

// Activity Log
export interface ActivityLog {
  id: string;
  type: 'round_start' | 'evaluation' | 'decision' | 'termination' | 'error';
  message: string;
  timestamp: Date;
  data?: Record<string, unknown>;
}

// Execution Result
export interface ExecutionResult {
  success: boolean;
  output: string;
  round: number;
  stability: number;
  terminated: boolean;
  termination_reason?: TerminationReason;
}

// WebSocket Message Types
export interface WSMessage {
  type: 'request' | 'response' | 'stream' | 'error' | 'status';
  payload: unknown;
  timestamp: Date;
}

export interface WSRequest {
  action: 'chat' | 'orchestrate' | 'evaluate' | 'configure';
  data: Record<string, unknown>;
}

export interface WSResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

// API Configuration
export interface APIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

// Game View Types (Phaser)
export interface GameAgent {
  id: string;
  sprite: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  color: number;
  role: 'planner' | 'critic' | 'researcher';
  x: number;
  y: number;
  targetX: number;
  targetY: number;
}

export interface DataFlow {
  from: string;
  to: string;
  active: boolean;
  particles?: Phaser.GameObjects.Particles.ParticleEmitter;
}

// App Settings
export interface AppSettings {
  theme: 'dark' | 'light';
  apiKeys: Partial<Record<AIProvider, string>>;
  defaultProvider: AIProvider;
  maxRounds: number;
  stabilityThreshold: number;
}
