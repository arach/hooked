import { config } from '../../core/config'
import { state } from '../../core/state'
import { presets } from '../../core/presets'
import * as speak from '../../core/speak'
import type { Evaluator } from '../types'

/**
 * Preset-based continuation evaluator.
 *
 * Checks for active preset in this order:
 * 1. Session-specific state (~/.hooked/state/{session_id}.json)
 * 2. Global config (~/.hooked/config.json)
 *
 * Toggle with:
 *   hooked bind test          (session-scoped, recommended)
 *   hooked continue test      (global, applies to all sessions)
 *   hooked off                (disable)
 *
 * @example
 * createStopHook([
 *   maxIterations(30),
 *   continueUntil(),
 * ])
 */
export function continueUntil(): Evaluator {
  return (ctx) => {
    const sessionId = ctx.input.session_id

    // Check session-specific preset first, then fall back to global
    const sessionPreset = state.getPreset(sessionId)
    const globalPreset = config.getActivePreset()
    const activePresetName = sessionPreset ?? globalPreset

    // If no preset is active, allow stop (default: off)
    if (!activePresetName) {
      return {
        shouldContinue: false,
        reason: 'Continuation not active',
      }
    }

    // Get the preset
    const preset = presets.get(activePresetName)
    if (!preset) {
      return {
        shouldContinue: false,
        reason: `Unknown preset: ${activePresetName}`,
      }
    }

    // Evaluate the preset
    const result = presets.evaluate(preset)

    if (result.done) {
      // Work is done! Clear the appropriate preset and allow stop
      if (sessionPreset) {
        // Clear session-specific preset
        state.setPreset(sessionId, null)
      } else {
        // Clear global preset
        config.setActivePreset(null)
      }

      // Announce completion via SpeakEasy
      speak.announceCompletion(activePresetName, ctx.project)

      return {
        shouldContinue: false,
        reason: result.reason,
      }
    }

    // Keep working
    return {
      shouldContinue: true,
      reason: result.reason,
    }
  }
}
