import type { Evaluator } from '../types'

/**
 * Safety valve that prevents runaway sessions.
 * After maxIterations, Claude is allowed to stop regardless of other evaluators.
 *
 * @param max Maximum number of iterations before forcing stop (default: 50)
 *
 * @example
 * createStopHook([
 *   maxIterations(30),
 *   commandSucceeds('pnpm build'),
 * ])
 */
export function maxIterations(max = 50): Evaluator {
  return (ctx) => {
    if (ctx.iteration >= max) {
      // We've hit the limit - allow stop (don't continue)
      // Note: returning shouldContinue: false means "ok to stop"
      return {
        shouldContinue: false,
        reason: `Safety limit reached (${max} iterations)`,
      }
    }

    // Under the limit, this evaluator doesn't block
    return {
      shouldContinue: false,
      reason: `Iteration ${ctx.iteration}/${max}`,
    }
  }
}
