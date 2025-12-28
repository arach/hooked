import { execSync } from 'child_process'
import { continuation } from '../../core/continuation'
import type { Evaluator } from '../types'

/**
 * Contextual continuation evaluator.
 *
 * Two modes:
 * - manual: Keep working until user says OFF
 * - check: Keep working until a command exits 0
 *
 * Toggle with:
 *   /hooked continuation "objective here"     (manual mode)
 *   /hooked continuation --check "pnpm test"  (check mode)
 *   /hooked continuation OFF
 *
 * @example
 * createStopHook([
 *   maxIterations(30),
 *   continueUntil(),
 * ])
 */
export function continueUntil(): Evaluator {
  return (_ctx) => {
    const state = continuation.get()

    // If continuation is not active, allow stop
    if (!state?.active) {
      return {
        shouldContinue: false,
        reason: 'Continuation not active',
      }
    }

    // Check mode: run command and check exit code
    if (state.mode === 'check' && state.check) {
      try {
        execSync(state.check, {
          stdio: 'pipe',
          timeout: 60000,
        })
        // Command succeeded (exit 0) - work is done!
        return {
          shouldContinue: false,
          reason: `Check passed: ${state.check}`,
        }
      } catch {
        // Command failed - keep working
        return {
          shouldContinue: true,
          reason: `Check failing: ${state.check}`,
        }
      }
    }

    // Manual mode: keep working until user says OFF
    const objective = state.objective
      ? `Objective: ${state.objective}`
      : 'Keep working (manual mode)'

    return {
      shouldContinue: true,
      reason: objective,
    }
  }
}
