import { execSync } from 'child_process'
import type { Evaluator } from '../types'

export interface CommandOptions {
  /** Working directory for the command (default: process.cwd()) */
  cwd?: string
  /** Timeout in milliseconds (default: 60000 = 1 minute) */
  timeout?: number
  /** Custom failure message */
  failureMessage?: string
}

/**
 * Keep working until a command succeeds (exits with code 0).
 * Great for build commands, linting, or any CLI check.
 *
 * @param command The shell command to run
 * @param options Optional configuration
 *
 * @example
 * createStopHook([
 *   maxIterations(30),
 *   commandSucceeds('pnpm build'),
 * ])
 *
 * @example
 * createStopHook([
 *   commandSucceeds('pnpm lint', { failureMessage: 'Lint errors remain' }),
 * ])
 */
export function commandSucceeds(command: string, options: CommandOptions = {}): Evaluator {
  const { cwd = process.cwd(), timeout = 60000, failureMessage } = options

  return () => {
    try {
      execSync(command, {
        cwd,
        timeout,
        stdio: 'pipe', // Capture output, don't print to terminal
        encoding: 'utf-8',
      })

      // Command succeeded
      return {
        shouldContinue: false,
        reason: `Command passed: ${command}`,
      }
    } catch (error) {
      // Command failed - Claude should keep working
      let reason = failureMessage ?? `Command failed: ${command}`

      // Try to extract useful error info
      if (error && typeof error === 'object' && 'stderr' in error) {
        const stderr = (error as { stderr?: string }).stderr
        if (stderr) {
          // Get last few lines of error output
          const lines = stderr.trim().split('\n')
          const tail = lines.slice(-5).join('\n')
          if (tail) {
            reason += `\n${tail}`
          }
        }
      }

      return {
        shouldContinue: true,
        reason,
      }
    }
  }
}

/**
 * Alias for commandSucceeds - more semantic for test commands
 */
export const testsPass = commandSucceeds

/**
 * Alias for commandSucceeds - more semantic for build commands
 */
export const buildSucceeds = commandSucceeds

/**
 * Alias for commandSucceeds - more semantic for lint commands
 */
export const lintPasses = commandSucceeds
