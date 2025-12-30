// Core utilities
export { log } from './core/log'
export { state } from './core/state'
export { config } from './core/config'
export { presets } from './core/presets'

// Legacy - kept for backwards compatibility
export { continuation } from './core/continuation'

// Stop hooks
export {
  createStopHook,
  maxIterations,
  commandSucceeds,
  testsPass,
  buildSucceeds,
  lintPasses,
  continueUntil,
} from './stop'

export type {
  Evaluator,
  EvaluatorContext,
  EvaluatorResult,
  StopHookOptions,
} from './stop'
