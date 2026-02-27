/**
 * Decision Engine Service
 *
 * Determines when orchestration should terminate.
 * Termination Conditions:
 * - stability > 0.85 (안정화)
 * - round >= 3 (하드 리밋)
 * - contradiction_trend UP (악화 → 중단)
 * - vs_goal == "farther" x2 (방향 잘못)
 * - missing_count == 0 (완료)
 */

import type {
  TerminationDecision,
  TerminationReason,
  RoundState,
  BlindEvaluation,
  StabilityMetrics,
} from '@/types';

export interface DecisionEngineConfig {
  maxRounds: number;           // Default: 3
  stabilityThreshold: number;  // Default: 0.85
  goalDivergenceLimit: number; // Default: 2 consecutive "farther"
}

const defaultConfig: DecisionEngineConfig = {
  maxRounds: 3,
  stabilityThreshold: 0.85,
  goalDivergenceLimit: 2,
};

interface DecisionContext {
  currentRound: RoundState;
  roundHistory: RoundState[];
  latestEvaluation: BlindEvaluation;
  latestStability: StabilityMetrics;
}

/**
 * Makes termination decision based on current state.
 */
export function makeTerminationDecision(
  context: DecisionContext,
  config: DecisionEngineConfig = defaultConfig
): TerminationDecision {
  const { currentRound, roundHistory, latestEvaluation, latestStability } = context;

  // Priority 1: Task Complete (missing_count == 0)
  if (latestEvaluation.missing.length === 0 &&
      latestEvaluation.contradictions.length === 0) {
    return {
      should_terminate: true,
      reason: 'task_complete',
      confidence: 0.95,
    };
  }

  // Priority 2: Stability Achieved
  if (latestStability.overall_stability >= config.stabilityThreshold) {
    return {
      should_terminate: true,
      reason: 'stability_achieved',
      confidence: latestStability.overall_stability,
    };
  }

  // Priority 3: Max Rounds Reached (Hard Limit)
  if (currentRound.number >= config.maxRounds) {
    return {
      should_terminate: true,
      reason: 'max_rounds_reached',
      confidence: 1.0,
    };
  }

  // Priority 4: Goal Diverging (vs_goal == "farther" x2)
  const goalDivergenceCount = countConsecutiveGoalDivergence(
    [...roundHistory, currentRound].map(r => r.evaluation).filter(Boolean) as BlindEvaluation[]
  );
  if (goalDivergenceCount >= config.goalDivergenceLimit) {
    return {
      should_terminate: true,
      reason: 'goal_diverging',
      confidence: 0.85,
    };
  }

  // Priority 5: Contradiction Trend Up
  if (isContradictionTrendUp(roundHistory, currentRound)) {
    return {
      should_terminate: true,
      reason: 'contradiction_trend_up',
      confidence: 0.75,
    };
  }

  // Continue
  return {
    should_terminate: false,
    reason: 'continue',
    confidence: 1 - latestStability.overall_stability,
  };
}

/**
 * Counts consecutive "farther" evaluations from recent history.
 */
function countConsecutiveGoalDivergence(evaluations: BlindEvaluation[]): number {
  let count = 0;
  for (let i = evaluations.length - 1; i >= 0; i--) {
    if (evaluations[i].vs_goal === 'farther') {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Checks if contradictions are trending upward.
 */
function isContradictionTrendUp(
  roundHistory: RoundState[],
  currentRound: RoundState
): boolean {
  if (roundHistory.length < 2) return false;

  const recentHistory = roundHistory.slice(-2);
  const currentContradictions = currentRound.evaluation?.contradictions.length ?? 0;

  // Check if contradictions are consistently increasing
  let increasing = true;
  let prevCount = 0;

  for (const round of recentHistory) {
    const count = round.evaluation?.contradictions.length ?? 0;
    if (count < prevCount) {
      increasing = false;
      break;
    }
    prevCount = count;
  }

  return increasing && currentContradictions > prevCount;
}

/**
 * Gets human-readable termination reason.
 */
export function getTerminationMessage(reason: TerminationReason): string {
  const messages: Record<TerminationReason, string> = {
    stability_achieved: '✅ System has reached stability threshold (>85%)',
    max_rounds_reached: '⏱️ Maximum rounds reached (hard limit)',
    contradiction_trend_up: '⚠️ Contradictions are increasing - stopping to prevent degradation',
    goal_diverging: '🔄 Plan is moving away from goal - manual intervention needed',
    task_complete: '🎉 Task completed - no missing elements or contradictions',
    continue: '➡️ Continuing to next round',
  };
  return messages[reason];
}

/**
 * Gets recommended action based on termination reason.
 */
export function getRecommendedAction(reason: TerminationReason): string {
  const actions: Record<TerminationReason, string> = {
    stability_achieved: 'Review the final plan and proceed with implementation',
    max_rounds_reached: 'Review current state and consider manual refinement',
    contradiction_trend_up: 'Analyze contradictions and clarify requirements',
    goal_diverging: 'Re-evaluate the goal definition and constraints',
    task_complete: 'Proceed with the finalized plan',
    continue: 'Wait for next round results',
  };
  return actions[reason];
}

/**
 * Creates decision summary for display.
 */
export function createDecisionSummary(decision: TerminationDecision): string[] {
  const lines: string[] = [];

  lines.push(`Decision: ${decision.should_terminate ? 'TERMINATE' : 'CONTINUE'}`);
  lines.push(`Reason: ${getTerminationMessage(decision.reason)}`);
  lines.push(`Confidence: ${(decision.confidence * 100).toFixed(1)}%`);
  lines.push(`Recommended: ${getRecommendedAction(decision.reason)}`);

  return lines;
}

/**
 * Validates that termination is appropriate given context.
 */
export function validateTerminationDecision(
  decision: TerminationDecision,
  context: DecisionContext
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (decision.should_terminate) {
    // Warn if terminating early with low confidence
    if (decision.confidence < 0.7) {
      warnings.push('Low confidence termination - consider manual review');
    }

    // Warn if missing items still exist
    if (context.latestEvaluation.missing.length > 0 &&
        decision.reason !== 'max_rounds_reached') {
      warnings.push(`${context.latestEvaluation.missing.length} items still missing`);
    }

    // Warn if risks exist
    if (context.latestEvaluation.risks.length > 0) {
      warnings.push(`${context.latestEvaluation.risks.length} risks identified`);
    }
  }

  return {
    valid: true,
    warnings,
  };
}
