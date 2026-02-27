/**
 * Stability Tracker Service
 *
 * Tracks stability metrics across rounds to determine convergence.
 * Formula: stability = (1 - contradiction_ratio) * 0.30 +
 *                      decision_reuse_rate * 0.25 +
 *                      plan_similarity * 0.25 +
 *                      goal_convergence * 0.20
 */

import type { StabilityMetrics, BlindEvaluation, Plan, RoundState } from '@/types';

export interface StabilityConfig {
  autoTerminateThreshold: number; // Default: 0.85
  warningThreshold: number;       // Default: 0.70
  weights: {
    contradictionRatio: number;
    decisionReuseRate: number;
    planSimilarity: number;
    goalConvergence: number;
  };
}

const defaultConfig: StabilityConfig = {
  autoTerminateThreshold: 0.85,
  warningThreshold: 0.70,
  weights: {
    contradictionRatio: 0.30,
    decisionReuseRate: 0.25,
    planSimilarity: 0.25,
    goalConvergence: 0.20,
  },
};

/**
 * Calculates stability metrics for current round.
 */
export function calculateStability(
  currentRound: RoundState,
  previousRound: RoundState | null,
  evaluation: BlindEvaluation,
  config: StabilityConfig = defaultConfig
): StabilityMetrics {
  const { weights } = config;

  // 1. Contradiction Ratio (lower is better)
  const maxExpectedContradictions = 5;
  const contradictionRatio = Math.min(
    evaluation.contradictions.length / maxExpectedContradictions,
    1
  );

  // 2. Decision Reuse Rate (higher is better)
  const decisionReuseRate = calculateDecisionReuseRate(
    currentRound.plan,
    previousRound?.plan ?? null
  );

  // 3. Plan Similarity (higher is better - means converging)
  const planSimilarity = calculatePlanSimilarity(
    currentRound.plan,
    previousRound?.plan ?? null
  );

  // 4. Goal Convergence (based on vs_goal evaluation)
  const goalConvergence = calculateGoalConvergence(evaluation);

  // Calculate overall stability
  const overallStability =
    (1 - contradictionRatio) * weights.contradictionRatio +
    decisionReuseRate * weights.decisionReuseRate +
    planSimilarity * weights.planSimilarity +
    goalConvergence * weights.goalConvergence;

  return {
    contradiction_ratio: contradictionRatio,
    decision_reuse_rate: decisionReuseRate,
    plan_similarity: planSimilarity,
    goal_convergence: goalConvergence,
    overall_stability: Math.round(overallStability * 100) / 100, // 2 decimal places
  };
}

/**
 * Calculates how many decisions from previous plan are reused.
 */
function calculateDecisionReuseRate(
  currentPlan: Plan | null,
  previousPlan: Plan | null
): number {
  if (!currentPlan || !previousPlan) {
    return 0.5; // Neutral for first round
  }

  const previousDecisions = new Set([
    ...previousPlan.goals,
    ...previousPlan.constraints,
    ...previousPlan.tasks.map(t => t.description.toLowerCase()),
  ]);

  const currentDecisions = [
    ...currentPlan.goals,
    ...currentPlan.constraints,
    ...currentPlan.tasks.map(t => t.description.toLowerCase()),
  ];

  if (currentDecisions.length === 0) return 0;

  let reusedCount = 0;
  for (const decision of currentDecisions) {
    // Check if decision exists in previous (fuzzy match)
    for (const prevDecision of previousDecisions) {
      if (calculateStringSimilarity(decision, prevDecision) > 0.7) {
        reusedCount++;
        break;
      }
    }
  }

  return reusedCount / currentDecisions.length;
}

/**
 * Calculates structural similarity between plans.
 */
function calculatePlanSimilarity(
  currentPlan: Plan | null,
  previousPlan: Plan | null
): number {
  if (!currentPlan || !previousPlan) {
    return 0.5; // Neutral for first round
  }

  const similarities: number[] = [];

  // Compare goals
  const goalSimilarity = calculateSetSimilarity(
    new Set(currentPlan.goals),
    new Set(previousPlan.goals)
  );
  similarities.push(goalSimilarity);

  // Compare task count
  const taskCountSimilarity =
    1 - Math.abs(currentPlan.tasks.length - previousPlan.tasks.length) /
      Math.max(currentPlan.tasks.length, previousPlan.tasks.length, 1);
  similarities.push(taskCountSimilarity);

  // Compare constraints
  const constraintSimilarity = calculateSetSimilarity(
    new Set(currentPlan.constraints),
    new Set(previousPlan.constraints)
  );
  similarities.push(constraintSimilarity);

  // Average similarities
  return similarities.reduce((a, b) => a + b, 0) / similarities.length;
}

/**
 * Calculates goal convergence based on evaluation.
 */
function calculateGoalConvergence(evaluation: BlindEvaluation): number {
  const vsGoalMap: Record<string, number> = {
    closer: 1.0,
    same: 0.5,
    farther: 0.0,
  };

  const vsPreviousMap: Record<string, number> = {
    better: 1.0,
    same: 0.5,
    worse: 0.0,
  };

  return (vsGoalMap[evaluation.vs_goal] * 0.7 + vsPreviousMap[evaluation.vs_previous] * 0.3);
}

/**
 * Jaccard similarity for sets.
 */
function calculateSetSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return intersection.size / union.size;
}

/**
 * Simple string similarity (Dice coefficient).
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1;
  if (s1.length < 2 || s2.length < 2) return 0;

  const getBigrams = (str: string): Map<string, number> => {
    const bigrams = new Map<string, number>();
    for (let i = 0; i < str.length - 1; i++) {
      const bigram = str.slice(i, i + 2);
      bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
    }
    return bigrams;
  };

  const bigrams1 = getBigrams(s1);
  const bigrams2 = getBigrams(s2);

  let intersectionSize = 0;
  for (const [bigram, count] of bigrams1) {
    intersectionSize += Math.min(count, bigrams2.get(bigram) || 0);
  }

  return (2 * intersectionSize) / (s1.length + s2.length - 2);
}

/**
 * Checks if stability indicates auto-termination.
 */
export function shouldAutoTerminate(
  stability: StabilityMetrics,
  config: StabilityConfig = defaultConfig
): boolean {
  return stability.overall_stability >= config.autoTerminateThreshold;
}

/**
 * Gets stability status for display.
 */
export function getStabilityStatus(
  stability: StabilityMetrics,
  config: StabilityConfig = defaultConfig
): { status: 'stable' | 'converging' | 'unstable'; message: string } {
  const { overall_stability } = stability;

  if (overall_stability >= config.autoTerminateThreshold) {
    return {
      status: 'stable',
      message: `System stable (${(overall_stability * 100).toFixed(1)}%) - Ready for auto-termination`,
    };
  }

  if (overall_stability >= config.warningThreshold) {
    return {
      status: 'converging',
      message: `Converging (${(overall_stability * 100).toFixed(1)}%) - Continue refinement`,
    };
  }

  return {
    status: 'unstable',
    message: `Unstable (${(overall_stability * 100).toFixed(1)}%) - Major changes needed`,
  };
}

/**
 * Creates a stability breakdown for display.
 */
export function createStabilityBreakdown(metrics: StabilityMetrics): string[] {
  return [
    `Contradiction Ratio: ${((1 - metrics.contradiction_ratio) * 100).toFixed(1)}%`,
    `Decision Reuse: ${(metrics.decision_reuse_rate * 100).toFixed(1)}%`,
    `Plan Similarity: ${(metrics.plan_similarity * 100).toFixed(1)}%`,
    `Goal Convergence: ${(metrics.goal_convergence * 100).toFixed(1)}%`,
    `─────────────────`,
    `Overall Stability: ${(metrics.overall_stability * 100).toFixed(1)}%`,
  ];
}
