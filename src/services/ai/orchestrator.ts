/**
 * AI Orchestrator Service
 *
 * Production-hardened orchestration with:
 * - Round-based execution (Architect → Refiner)
 * - Blind evaluation (no score gaming)
 * - Stability tracking (auto-termination)
 * - Decision engine (multiple termination conditions)
 */

import type {
  Plan,
  BlindEvaluation,
  StabilityMetrics,
  TerminationDecision,
  RoundState,
  ExecutionResult,
  ActivityLog,
} from '@/types';

import {
  createBlindEvaluationPrompt,
  parseBlindEvaluation,
  createEvaluationSummary,
  type BlindJudgeInput,
} from './blindJudge';

import {
  calculateStability,
  getStabilityStatus,
  createStabilityBreakdown,
} from './stabilityTracker';

import {
  makeTerminationDecision,
  getTerminationMessage,
  createDecisionSummary,
  validateTerminationDecision,
} from './decisionEngine';

import {
  createArchitectPrompt,
  createRefinerPrompt,
  parsePlanResponse,
  validateAgainstLockedStructure,
  createLockedStructure,
  createPlanSummary,
  type PlannerInput,
} from './planner';

export interface OrchestratorConfig {
  maxRounds: number;
  stabilityThreshold: number;
  onRoundStart?: (round: number) => void;
  onRoundComplete?: (result: RoundResult) => void;
  onTerminate?: (result: ExecutionResult) => void;
  onLog?: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => void;
}

export interface RoundResult {
  round: number;
  plan: Plan;
  evaluation: BlindEvaluation;
  stability: StabilityMetrics;
  decision: TerminationDecision;
}

export interface OrchestratorState {
  currentRound: RoundState;
  roundHistory: RoundState[];
  goal: string;
  context: string;
  isRunning: boolean;
  lastResult: ExecutionResult | null;
}

const defaultConfig: OrchestratorConfig = {
  maxRounds: 3,
  stabilityThreshold: 0.85,
};

/**
 * Main orchestration class.
 */
export class Orchestrator {
  private state: OrchestratorState;
  private config: OrchestratorConfig;
  private aiProvider: (prompt: string) => Promise<string>;

  constructor(
    aiProvider: (prompt: string) => Promise<string>,
    config: Partial<OrchestratorConfig> = {}
  ) {
    this.aiProvider = aiProvider;
    this.config = { ...defaultConfig, ...config };
    this.state = this.createInitialState();
  }

  private createInitialState(): OrchestratorState {
    return {
      currentRound: {
        number: 0,
        phase: 'ARCHITECT',
        plan: null,
        evaluation: null,
        stability: null,
        locked_structure: null,
      },
      roundHistory: [],
      goal: '',
      context: '',
      isRunning: false,
      lastResult: null,
    };
  }

  /**
   * Starts orchestration for a goal.
   */
  async execute(goal: string, context: string = ''): Promise<ExecutionResult> {
    this.state = this.createInitialState();
    this.state.goal = goal;
    this.state.context = context;
    this.state.isRunning = true;

    this.log({ type: 'round_start', message: `Starting orchestration for: ${goal}` });

    try {
      while (this.state.isRunning) {
        const roundResult = await this.executeRound();

        if (roundResult.decision.should_terminate) {
          return this.terminate(roundResult);
        }
      }

      // Should not reach here
      return this.terminate({
        round: this.state.currentRound.number,
        plan: this.state.currentRound.plan!,
        evaluation: this.state.currentRound.evaluation!,
        stability: this.state.currentRound.stability!,
        decision: {
          should_terminate: true,
          reason: 'max_rounds_reached',
          confidence: 1.0,
        },
      });
    } catch (error) {
      this.log({
        type: 'error',
        message: `Orchestration error: ${error}`,
        data: { error: String(error) },
      });

      return {
        success: false,
        output: `Orchestration failed: ${error}`,
        round: this.state.currentRound.number,
        stability: this.state.currentRound.stability?.overall_stability ?? 0,
        terminated: true,
        termination_reason: 'max_rounds_reached',
      };
    }
  }

  /**
   * Executes a single round.
   */
  private async executeRound(): Promise<RoundResult> {
    // Start new round
    this.startNewRound();
    const roundNumber = this.state.currentRound.number;

    this.config.onRoundStart?.(roundNumber);
    this.log({
      type: 'round_start',
      message: `Round ${roundNumber} started (${this.state.currentRound.phase})`,
    });

    // Step 1: Generate Plan
    const plan = await this.generatePlan();
    this.state.currentRound.plan = plan;

    this.log({
      type: 'decision',
      message: `Plan generated with ${plan.tasks.length} tasks`,
      data: { plan_summary: createPlanSummary(plan) },
    });

    // Step 2: Lock structure in Round 1
    if (roundNumber === 1) {
      this.state.currentRound.locked_structure = createLockedStructure(plan, roundNumber);
      this.log({
        type: 'decision',
        message: 'Structure LOCKED - future rounds can only refine',
      });
    }

    // Step 3: Blind Evaluation
    const evaluation = await this.evaluatePlan(plan);
    this.state.currentRound.evaluation = evaluation;

    this.log({
      type: 'evaluation',
      message: createEvaluationSummary(evaluation),
    });

    // Step 4: Calculate Stability
    const previousRound = this.state.roundHistory[this.state.roundHistory.length - 1] ?? null;
    const stability = calculateStability(
      this.state.currentRound,
      previousRound,
      evaluation
    );
    this.state.currentRound.stability = stability;

    const stabilityStatus = getStabilityStatus(stability);
    this.log({
      type: 'evaluation',
      message: stabilityStatus.message,
      data: { breakdown: createStabilityBreakdown(stability) },
    });

    // Step 5: Make Termination Decision
    const decision = makeTerminationDecision(
      {
        currentRound: this.state.currentRound,
        roundHistory: this.state.roundHistory,
        latestEvaluation: evaluation,
        latestStability: stability,
      },
      {
        maxRounds: this.config.maxRounds,
        stabilityThreshold: this.config.stabilityThreshold,
        goalDivergenceLimit: 2,
      }
    );

    const validation = validateTerminationDecision(decision, {
      currentRound: this.state.currentRound,
      roundHistory: this.state.roundHistory,
      latestEvaluation: evaluation,
      latestStability: stability,
    });

    if (validation.warnings.length > 0) {
      this.log({
        type: 'decision',
        message: `Warnings: ${validation.warnings.join(', ')}`,
      });
    }

    this.log({
      type: 'decision',
      message: getTerminationMessage(decision.reason),
      data: { summary: createDecisionSummary(decision) },
    });

    const result: RoundResult = {
      round: roundNumber,
      plan,
      evaluation,
      stability,
      decision,
    };

    this.config.onRoundComplete?.(result);

    return result;
  }

  /**
   * Generates a plan using the appropriate phase prompt.
   */
  private async generatePlan(): Promise<Plan> {
    const { currentRound, goal, context, roundHistory } = this.state;
    const previousPlan = roundHistory[roundHistory.length - 1]?.plan ?? null;

    const plannerInput: PlannerInput = {
      goal,
      context,
      previousPlan,
      lockedStructure: currentRound.locked_structure,
      phase: currentRound.phase,
    };

    const prompt =
      currentRound.phase === 'ARCHITECT'
        ? createArchitectPrompt(plannerInput)
        : createRefinerPrompt(plannerInput);

    const response = await this.aiProvider(prompt);
    const plan = parsePlanResponse(response);

    // Validate against locked structure if in refiner phase
    if (currentRound.phase === 'REFINER' && currentRound.locked_structure) {
      const validation = validateAgainstLockedStructure(plan, currentRound.locked_structure);
      if (!validation.valid) {
        this.log({
          type: 'error',
          message: `Structure violations detected: ${validation.violations.join(', ')}`,
        });
      }
    }

    return plan;
  }

  /**
   * Evaluates a plan using blind evaluation.
   */
  private async evaluatePlan(plan: Plan): Promise<BlindEvaluation> {
    const { roundHistory, goal } = this.state;
    const previousPlan = roundHistory[roundHistory.length - 1]?.plan ?? null;

    const judgeInput: BlindJudgeInput = {
      currentPlan: plan,
      previousPlan,
      goal,
      lockedStructure: this.state.currentRound.locked_structure,
    };

    const prompt = createBlindEvaluationPrompt(judgeInput);
    const response = await this.aiProvider(prompt);
    return parseBlindEvaluation(response);
  }

  /**
   * Starts a new round.
   */
  private startNewRound(): void {
    // Archive current round if it has content
    if (this.state.currentRound.number > 0) {
      this.state.roundHistory.push({ ...this.state.currentRound });
    }

    const newRoundNumber = this.state.currentRound.number + 1;
    const isFirstRound = newRoundNumber === 1;

    this.state.currentRound = {
      number: newRoundNumber,
      phase: isFirstRound ? 'ARCHITECT' : 'REFINER',
      plan: null,
      evaluation: null,
      stability: null,
      locked_structure: isFirstRound
        ? null
        : this.state.currentRound.locked_structure,
    };
  }

  /**
   * Terminates orchestration and returns final result.
   */
  private terminate(roundResult: RoundResult): ExecutionResult {
    this.state.isRunning = false;

    const result: ExecutionResult = {
      success: roundResult.decision.reason === 'stability_achieved' ||
               roundResult.decision.reason === 'task_complete',
      output: this.createFinalOutput(roundResult),
      round: roundResult.round,
      stability: roundResult.stability.overall_stability,
      terminated: true,
      termination_reason: roundResult.decision.reason,
    };

    this.state.lastResult = result;
    this.config.onTerminate?.(result);

    this.log({
      type: 'termination',
      message: `Orchestration terminated: ${getTerminationMessage(roundResult.decision.reason)}`,
      data: { result },
    });

    return result;
  }

  /**
   * Creates final output summary.
   */
  private createFinalOutput(roundResult: RoundResult): string {
    const lines: string[] = [];

    lines.push('═══════════════════════════════════════');
    lines.push('           ORCHESTRATION COMPLETE');
    lines.push('═══════════════════════════════════════');
    lines.push('');
    lines.push(...createPlanSummary(roundResult.plan));
    lines.push('');
    lines.push('─────────────────────────────────────');
    lines.push('📊 METRICS');
    lines.push('─────────────────────────────────────');
    lines.push(`Rounds: ${roundResult.round}`);
    lines.push(`Stability: ${(roundResult.stability.overall_stability * 100).toFixed(1)}%`);
    lines.push(`Termination: ${roundResult.decision.reason}`);
    lines.push('');
    lines.push(...createStabilityBreakdown(roundResult.stability));

    return lines.join('\n');
  }

  /**
   * Logs activity.
   */
  private log(log: Omit<ActivityLog, 'id' | 'timestamp'>): void {
    this.config.onLog?.(log);
  }

  /**
   * Gets current state (for debugging/display).
   */
  getState(): OrchestratorState {
    return { ...this.state };
  }
}

/**
 * Creates orchestrator instance with default configuration.
 */
export function createOrchestrator(
  aiProvider: (prompt: string) => Promise<string>,
  config?: Partial<OrchestratorConfig>
): Orchestrator {
  return new Orchestrator(aiProvider, config);
}
