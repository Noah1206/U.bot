/**
 * Blind Judge Service
 *
 * Production-hardened evaluation system that prevents LLM gaming.
 * Key principle: LLM never sees numeric scores, only qualitative comparisons.
 */

import type { BlindEvaluation, Plan, LockedStructure } from '@/types';

export interface BlindJudgeInput {
  currentPlan: Plan;
  previousPlan: Plan | null;
  goal: string;
  lockedStructure: LockedStructure | null;
}

export interface BlindJudgeConfig {
  maxContradictions: number;
  maxMissing: number;
  maxRisks: number;
}

const defaultConfig: BlindJudgeConfig = {
  maxContradictions: 5,
  maxMissing: 10,
  maxRisks: 5,
};

/**
 * Creates a prompt for blind evaluation.
 * IMPORTANT: No numeric scores in output - prevents gaming.
 */
export function createBlindEvaluationPrompt(input: BlindJudgeInput): string {
  const { currentPlan, previousPlan, goal, lockedStructure } = input;

  let prompt = `You are a blind judge evaluating a plan. You must provide QUALITATIVE assessments only.
DO NOT provide numeric scores - this prevents gaming of the evaluation system.

## Goal
${goal}

## Current Plan
Goals: ${currentPlan.goals.join(', ')}
Tasks: ${currentPlan.tasks.map(t => t.description).join('\n- ')}
Constraints: ${currentPlan.constraints.join(', ')}
`;

  if (previousPlan) {
    prompt += `
## Previous Plan (for comparison)
Goals: ${previousPlan.goals.join(', ')}
Tasks: ${previousPlan.tasks.map(t => t.description).join('\n- ')}
Constraints: ${previousPlan.constraints.join(', ')}
`;
  }

  if (lockedStructure) {
    prompt += `
## Locked Structure (CANNOT be changed)
Goals: ${lockedStructure.goals.join(', ')}
Core Decisions: ${lockedStructure.core_decisions.join(', ')}
Locked at Round: ${lockedStructure.locked_at_round}
`;
  }

  prompt += `
## Evaluation Instructions

Provide your evaluation in the following JSON format ONLY:
{
  "vs_previous": "better" | "same" | "worse",  // Compared to previous plan
  "vs_goal": "closer" | "same" | "farther",    // Progress toward goal
  "contradictions": ["list of logical contradictions"],
  "missing": ["list of missing elements"],
  "risks": ["list of identified risks"]
}

DO NOT include any numeric scores or ratings. Respond with JSON only.`;

  return prompt;
}

/**
 * Parses the blind evaluation response from LLM.
 */
export function parseBlindEvaluation(response: string): BlindEvaluation {
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate structure
    const evaluation: BlindEvaluation = {
      vs_previous: validateComparison(parsed.vs_previous, ['better', 'same', 'worse']),
      vs_goal: validateComparison(parsed.vs_goal, ['closer', 'same', 'farther']),
      contradictions: validateStringArray(parsed.contradictions),
      missing: validateStringArray(parsed.missing),
      risks: validateStringArray(parsed.risks),
    };

    return evaluation;
  } catch (error) {
    console.error('Failed to parse blind evaluation:', error);
    // Return conservative default
    return {
      vs_previous: 'same',
      vs_goal: 'same',
      contradictions: ['Evaluation parsing failed'],
      missing: [],
      risks: ['Unable to properly evaluate plan'],
    };
  }
}

function validateComparison<T extends string>(value: unknown, valid: T[]): T {
  if (typeof value === 'string' && valid.includes(value as T)) {
    return value as T;
  }
  return valid[1] as T; // Default to middle option ('same')
}

function validateStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(item => typeof item === 'string').slice(0, 10);
  }
  return [];
}

/**
 * Detects if evaluation shows concerning patterns.
 */
export function detectConcerningPatterns(
  evaluations: BlindEvaluation[],
  config: BlindJudgeConfig = defaultConfig
): { concern: string; severity: 'low' | 'medium' | 'high' }[] {
  const concerns: { concern: string; severity: 'low' | 'medium' | 'high' }[] = [];

  if (evaluations.length < 2) return concerns;

  const latest = evaluations[evaluations.length - 1];
  const previous = evaluations[evaluations.length - 2];

  // Check for worsening trend
  if (latest.vs_previous === 'worse') {
    concerns.push({
      concern: 'Plan quality is degrading compared to previous iteration',
      severity: 'medium',
    });
  }

  // Check for goal divergence
  if (latest.vs_goal === 'farther') {
    concerns.push({
      concern: 'Plan is moving away from the goal',
      severity: 'high',
    });
  }

  // Check for increasing contradictions
  if (latest.contradictions.length > previous.contradictions.length) {
    concerns.push({
      concern: 'Contradictions are increasing',
      severity: 'medium',
    });
  }

  // Check for excessive contradictions
  if (latest.contradictions.length >= config.maxContradictions) {
    concerns.push({
      concern: `Too many contradictions detected (${latest.contradictions.length})`,
      severity: 'high',
    });
  }

  // Check for excessive missing elements
  if (latest.missing.length >= config.maxMissing) {
    concerns.push({
      concern: `Many elements still missing (${latest.missing.length})`,
      severity: 'medium',
    });
  }

  // Check for high-risk accumulation
  if (latest.risks.length >= config.maxRisks) {
    concerns.push({
      concern: `Multiple risks identified (${latest.risks.length})`,
      severity: 'medium',
    });
  }

  return concerns;
}

/**
 * Creates evaluation summary for display (no scores exposed to LLM).
 */
export function createEvaluationSummary(evaluation: BlindEvaluation): string {
  const parts: string[] = [];

  // Progress indicators
  const vsGoalEmoji = {
    closer: '📈',
    same: '➡️',
    farther: '📉',
  }[evaluation.vs_goal];

  const vsPrevEmoji = {
    better: '✅',
    same: '➡️',
    worse: '❌',
  }[evaluation.vs_previous];

  parts.push(`Goal Progress: ${vsGoalEmoji} ${evaluation.vs_goal}`);
  parts.push(`vs Previous: ${vsPrevEmoji} ${evaluation.vs_previous}`);

  if (evaluation.contradictions.length > 0) {
    parts.push(`⚠️ Contradictions: ${evaluation.contradictions.length}`);
  }

  if (evaluation.missing.length > 0) {
    parts.push(`📋 Missing: ${evaluation.missing.length} items`);
  }

  if (evaluation.risks.length > 0) {
    parts.push(`🔴 Risks: ${evaluation.risks.length}`);
  }

  return parts.join(' | ');
}
