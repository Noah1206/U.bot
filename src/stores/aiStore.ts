import { create } from 'zustand';
import type {
  AIAgent,
  RoundState,
  ActivityLog,
  ExecutionResult,
  BlindEvaluation,
  StabilityMetrics,
  TerminationDecision,
  RoundPhase,
} from '@/types';

interface AIState {
  // Agents
  agents: AIAgent[];
  activeAgentId: string | null;
  setActiveAgent: (id: string | null) => void;
  updateAgentStatus: (id: string, status: AIAgent['status']) => void;

  // Round state
  currentRound: RoundState;
  roundHistory: RoundState[];
  startNewRound: () => void;
  setRoundPhase: (phase: RoundPhase) => void;
  updateEvaluation: (evaluation: BlindEvaluation) => void;
  updateStability: (stability: StabilityMetrics) => void;
  lockStructure: () => void;

  // Execution
  lastResult: ExecutionResult | null;
  setLastResult: (result: ExecutionResult) => void;

  // Termination
  terminationDecision: TerminationDecision | null;
  setTerminationDecision: (decision: TerminationDecision) => void;

  // Activity log
  activityLogs: ActivityLog[];
  addActivityLog: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => void;
  clearActivityLogs: () => void;

  // Reset
  resetOrchestration: () => void;
}

const generateId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const defaultAgents: AIAgent[] = [
  {
    id: 'planner',
    name: 'Planner',
    provider: 'openai',
    model: 'gpt-4o',
    role: 'planner',
    status: 'idle',
    color: '#3b82f6', // Blue
  },
  {
    id: 'critic',
    name: 'Critic',
    provider: 'claude',
    model: 'claude-3-opus',
    role: 'critic',
    status: 'idle',
    color: '#ef4444', // Red
  },
  {
    id: 'researcher',
    name: 'Researcher',
    provider: 'gemini',
    model: 'gemini-pro',
    role: 'researcher',
    status: 'idle',
    color: '#22c55e', // Green
  },
];

const initialRoundState: RoundState = {
  number: 0,
  phase: 'ARCHITECT',
  plan: null,
  evaluation: null,
  stability: null,
  locked_structure: null,
};

export const useAIStore = create<AIState>((set) => ({
  // Agents
  agents: defaultAgents,
  activeAgentId: null,
  setActiveAgent: (id) => set({ activeAgentId: id }),
  updateAgentStatus: (id, status) =>
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === id ? { ...agent, status } : agent
      ),
    })),

  // Round state
  currentRound: initialRoundState,
  roundHistory: [],
  startNewRound: () =>
    set((state) => {
      const newRoundNumber = state.currentRound.number + 1;
      const isFirstRound = newRoundNumber === 1;

      // Archive current round if it's not the initial state
      const newHistory =
        state.currentRound.number > 0
          ? [...state.roundHistory, state.currentRound]
          : state.roundHistory;

      return {
        roundHistory: newHistory,
        currentRound: {
          number: newRoundNumber,
          phase: isFirstRound ? 'ARCHITECT' : 'REFINER',
          plan: null,
          evaluation: null,
          stability: null,
          locked_structure: isFirstRound
            ? null
            : state.currentRound.locked_structure,
        },
      };
    }),
  setRoundPhase: (phase) =>
    set((state) => ({
      currentRound: { ...state.currentRound, phase },
    })),
  updateEvaluation: (evaluation) =>
    set((state) => ({
      currentRound: { ...state.currentRound, evaluation },
    })),
  updateStability: (stability) =>
    set((state) => ({
      currentRound: { ...state.currentRound, stability },
    })),
  lockStructure: () =>
    set((state) => {
      if (!state.currentRound.plan) return state;
      return {
        currentRound: {
          ...state.currentRound,
          locked_structure: {
            goals: state.currentRound.plan.goals,
            core_decisions: state.currentRound.plan.constraints,
            locked_at_round: state.currentRound.number,
          },
        },
      };
    }),

  // Execution
  lastResult: null,
  setLastResult: (result) => set({ lastResult: result }),

  // Termination
  terminationDecision: null,
  setTerminationDecision: (decision) => set({ terminationDecision: decision }),

  // Activity log
  activityLogs: [],
  addActivityLog: (log) => {
    const newLog: ActivityLog = {
      ...log,
      id: generateId(),
      timestamp: new Date(),
    };
    set((state) => ({
      activityLogs: [...state.activityLogs, newLog].slice(-100), // Keep last 100
    }));
  },
  clearActivityLogs: () => set({ activityLogs: [] }),

  // Reset
  resetOrchestration: () =>
    set({
      currentRound: initialRoundState,
      roundHistory: [],
      lastResult: null,
      terminationDecision: null,
      agents: defaultAgents,
      activeAgentId: null,
    }),
}));
