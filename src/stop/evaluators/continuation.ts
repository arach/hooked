import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import * as speak from '../../core/speak'
import type { Evaluator } from '../types'

interface ContinuationState {
  active: boolean
  mode: 'manual' | 'check'
  objective?: string
  check?: string
  project?: string
}

const CONTINUATION_FILE = join(homedir(), '.hooked', 'state', 'continuation.json')

function getContinuation(): ContinuationState | null {
  if (!existsSync(CONTINUATION_FILE)) {
    return null
  }
  try {
    return JSON.parse(readFileSync(CONTINUATION_FILE, 'utf-8'))
  } catch {
    return null
  }
}

/**
 * Simple continuation evaluator.
 *
 * Reads ~/.hooked/state/continuation.json and blocks if active.
 * Announces via SpeakEasy when blocking.
 */
export function continueUntil(): Evaluator {
  return async (ctx) => {
    const continuation = getContinuation()

    // No continuation active
    if (!continuation?.active) {
      return {
        shouldContinue: false,
        reason: 'Continuation not active',
      }
    }

    // Check mode: run the command
    if (continuation.mode === 'check' && continuation.check) {
      const { execSync } = await import('child_process')
      try {
        execSync(continuation.check, { stdio: 'pipe', timeout: 60000 })
        // Check passed! Allow stop
        await speak.announceCompletion('check', ctx.project)
        return {
          shouldContinue: false,
          reason: `Check passed: ${continuation.check}`,
        }
      } catch {
        // Check failed, keep working
        await speak.speak(`Check failed. Keep working.`)
        return {
          shouldContinue: true,
          reason: `Check failed: ${continuation.check}`,
        }
      }
    }

    // Manual mode: just keep working
    const objective = continuation.objective || 'manual continuation'
    await speak.speak(`Continuation active. ${objective}`)

    return {
      shouldContinue: true,
      reason: `Manual: ${objective}`,
    }
  }
}
