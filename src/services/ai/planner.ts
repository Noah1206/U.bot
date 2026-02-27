/**
 * Planner Service
 *
 * Two-phase planning system:
 * - Round 1 (ARCHITECT): Creates structure that gets LOCKED
 * - Round 2+ (REFINER): Can only modify details, not structure
 */

import type { Plan, PlanTask, LockedStructure, RoundPhase } from '@/types';

export interface PlannerInput {
  goal: string;
  context: string;
  previousPlan: Plan | null;
  lockedStructure: LockedStructure | null;
  phase: RoundPhase;
  constraints?: string[];
}

/**
 * Creates the architect prompt for Round 1.
 * This establishes the core structure that will be locked.
 */
export function createArchitectPrompt(input: PlannerInput): string {
  const { goal, context, constraints = [] } = input;

  return `You are an ARCHITECT creating the foundational structure for a plan.
IMPORTANT: The structure you create will be LOCKED and cannot be changed in future rounds.
Focus on getting the core decisions RIGHT.

## Goal
${goal}

## Context
${context}

${constraints.length > 0 ? `## Constraints\n${constraints.join('\n')}` : ''}

## Your Task
Create a comprehensive plan with:
1. Clear, measurable GOALS (these will be locked)
2. Well-defined TASKS with priorities
3. Core CONSTRAINTS and decisions

Respond in JSON format:
{
  "goals": ["goal1", "goal2", ...],
  "tasks": [
    {
      "description": "task description",
      "priority": "high" | "medium" | "low",
      "dependencies": ["other task descriptions"]
    }
  ],
  "constraints": ["constraint1", "constraint2", ...]
}

Focus on correctness over completeness - this structure will be locked.`;
}

/**
 * Creates the refiner prompt for Round 2+.
 * Can only modify details, not the locked structure.
 */
export function createRefinerPrompt(input: PlannerInput): string {
  const { goal, context, previousPlan, lockedStructure, constraints = [] } = input;

  if (!lockedStructure || !previousPlan) {
    throw new Error('Refiner phase requires locked structure and previous plan');
  }

  return `You are a REFINER improving an existing plan.
CRITICAL: You CANNOT change the locked structure. Only refine details.

## Goal
${goal}

## Context
${context}

## LOCKED STRUCTURE (DO NOT CHANGE)
Goals: ${lockedStructure.goals.join(', ')}
Core Decisions: ${lockedStructure.core_decisions.join(', ')}

## Previous Plan
Goals: ${previousPlan.goals.join(', ')}
Tasks:
${previousPlan.tasks.map(t => `- [${t.priority}] ${t.description}`).join('\n')}
Constraints: ${previousPlan.constraints.join(', ')}

${constraints.length > 0 ? `## Additional Constraints\n${constraints.join('\n')}` : ''}

## Your Task
REFINE the plan by:
1. Keeping ALL locked goals exactly as is
2. Improving task descriptions and priorities
3. Adding missing implementation details
4. Clarifying dependencies

You MAY:
- Add new tasks (that support locked goals)
- Improve task descriptions
- Adjust task priorities
- Add clarifying constraints

You MUST NOT:
- Change locked goals
- Remove locked constraints
- Fundamentally alter the approach

Respond in JSON format:
{
  "goals": ["must match locked goals exactly"],
  "tasks": [
    {
      "description": "refined task description",
      "priority": "high" | "medium" | "low",
      "dependencies": ["other task descriptions"]
    }
  ],
  "constraints": ["original + any clarifying constraints"]
}`;
}

/**
 * Parses plan response from LLM.
 */
export function parsePlanResponse(response: string): Plan {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const plan: Plan = {
      id: `plan_${Date.now()}`,
      goals: validateStringArray(parsed.goals),
      tasks: parseTasks(parsed.tasks),
      constraints: validateStringArray(parsed.constraints),
      created_at: new Date(),
    };

    return plan;
  } catch (error) {
    console.error('Failed to parse plan response:', error);
    throw new Error(`Plan parsing failed: ${error}`);
  }
}

function parseTasks(tasks: unknown): PlanTask[] {
  if (!Array.isArray(tasks)) return [];

  return tasks.map((task, index) => ({
    id: `task_${index}_${Date.now()}`,
    description: String(task.description || 'Unknown task'),
    priority: validatePriority(task.priority),
    status: 'pending' as const,
    dependencies: validateStringArray(task.dependencies),
  }));
}

function validateStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(item => typeof item === 'string');
  }
  return [];
}

function validatePriority(value: unknown): 'high' | 'medium' | 'low' {
  if (value === 'high' || value === 'medium' || value === 'low') {
    return value;
  }
  return 'medium';
}

/**
 * Validates that a refined plan respects the locked structure.
 */
export function validateAgainstLockedStructure(
  plan: Plan,
  lockedStructure: LockedStructure
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  // Check if locked goals are preserved
  const planGoalsSet = new Set(plan.goals.map(g => g.toLowerCase()));
  for (const lockedGoal of lockedStructure.goals) {
    if (!planGoalsSet.has(lockedGoal.toLowerCase())) {
      violations.push(`Locked goal removed: "${lockedGoal}"`);
    }
  }

  // Check if core decisions are respected
  // This is a semantic check - in production, use LLM for this
  // For now, we do a simple keyword check
  const planText = JSON.stringify(plan).toLowerCase();
  for (const decision of lockedStructure.core_decisions) {
    const keywords = decision.toLowerCase().split(' ').filter(w => w.length > 4);
    const matchCount = keywords.filter(kw => planText.includes(kw)).length;
    if (matchCount < keywords.length * 0.5) {
      violations.push(`Core decision may be violated: "${decision}"`);
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Creates locked structure from architect plan.
 */
export function createLockedStructure(plan: Plan, round: number): LockedStructure {
  return {
    goals: [...plan.goals],
    core_decisions: [...plan.constraints],
    locked_at_round: round,
  };
}

/**
 * Generates a plan summary for display.
 */
export function createPlanSummary(plan: Plan): string[] {
  const lines: string[] = [];

  lines.push('📋 PLAN SUMMARY');
  lines.push('─────────────────');

  lines.push('\n🎯 Goals:');
  plan.goals.forEach((goal, i) => {
    lines.push(`  ${i + 1}. ${goal}`);
  });

  lines.push('\n📝 Tasks:');
  const tasksByPriority = {
    high: plan.tasks.filter(t => t.priority === 'high'),
    medium: plan.tasks.filter(t => t.priority === 'medium'),
    low: plan.tasks.filter(t => t.priority === 'low'),
  };

  if (tasksByPriority.high.length > 0) {
    lines.push('  🔴 High Priority:');
    tasksByPriority.high.forEach(t => lines.push(`    - ${t.description}`));
  }
  if (tasksByPriority.medium.length > 0) {
    lines.push('  🟡 Medium Priority:');
    tasksByPriority.medium.forEach(t => lines.push(`    - ${t.description}`));
  }
  if (tasksByPriority.low.length > 0) {
    lines.push('  🟢 Low Priority:');
    tasksByPriority.low.forEach(t => lines.push(`    - ${t.description}`));
  }

  lines.push('\n⚠️ Constraints:');
  plan.constraints.forEach(c => lines.push(`  - ${c}`));

  return lines;
}
