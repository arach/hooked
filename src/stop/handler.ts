#!/usr/bin/env node

import { log } from '../core/log'
import { state } from '../core/state'
import * as speak from '../core/speak'
import type {
  StopHookInput,
  StopHookResponse,
  Evaluator,
  EvaluatorContext,
  StopHookOptions,
} from './types'

function deriveProjectName(transcriptPath?: string): string | undefined {
  if (!transcriptPath) return undefined

  // Match pattern: projects/{hash}-{project-name}/
  const dashedMatch = transcriptPath.match(/projects\/[^/]*-([^/]+)\//)
  if (dashedMatch?.[1]) {
    return dashedMatch[1].replace(/-/g, ' ')
  }

  // Match pattern: projects/{project-name}/
  const plainMatch = transcriptPath.match(/projects\/([^/]+)\//)
  if (plainMatch?.[1]) {
    return plainMatch[1].replace(/-/g, ' ')
  }

  return undefined
}

async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk) => {
      data += chunk
    })
    process.stdin.on('end', () => resolve(data))
    process.stdin.on('error', reject)
  })
}

function output(response: StopHookResponse): void {
  console.log(JSON.stringify(response))
}

function outputBlock(reason: string): void {
  output({ decision: 'block', reason })
}

function outputApprove(): void {
  output({ decision: 'approve' })
}

export function createStopHook(evaluators: Evaluator[], options: StopHookOptions = {}) {
  return async function main(): Promise<void> {
    // Read and parse input
    const rawInput = await readStdin()
    let input: StopHookInput

    try {
      input = JSON.parse(rawInput) as StopHookInput
    } catch {
      // Invalid input, allow stop
      outputApprove()
      return
    }

    const { session_id: sessionId, transcript_path: transcriptPath, stop_hook_active: stopHookActive } = input
    const project = deriveProjectName(transcriptPath)

    // Check for pending activation and claim it for this session
    const claimed = state.claimPending(sessionId, project)
    if (claimed && claimed.activePreset) {
      log.event({
        session: sessionId,
        project,
        event: 'stop:claimed-pending',
        preset: claimed.activePreset,
        objective: claimed.objective,
      })

      // Announce via SpeakEasy
      await speak.announceContinuation(claimed.activePreset, project, claimed.objective ?? undefined)
    }

    // If not actively continuing from a previous stop hook, just approve
    // (This is the first time Claude is trying to stop)
    if (!stopHookActive) {
      // Increment iteration counter for this session
      const sessionState = state.increment(sessionId, project)

      log.event({
        session: sessionId,
        project,
        event: 'stop:initial',
        iteration: sessionState.iteration,
      })
    }

    const currentIteration = state.getIteration(sessionId)

    const ctx: EvaluatorContext = {
      input,
      iteration: currentIteration,
      project,
    }

    // Run all evaluators
    for (const evaluator of evaluators) {
      try {
        const result = await evaluator(ctx)

        if (result.shouldContinue) {
          // This evaluator says Claude should keep working
          log.event({
            session: sessionId,
            project,
            event: 'stop:block',
            reason: result.reason,
            iteration: currentIteration,
          })

          // Call onBlock callback if provided
          if (options.onBlock) {
            await options.onBlock({ ...ctx, reason: result.reason })
          }

          // Provide feedback to Claude
          const feedback = `[Iteration ${currentIteration}] ${result.reason}`
          console.error(feedback)

          outputBlock(result.reason)
          return
        }
      } catch (error) {
        // Evaluator failed, log but continue to next evaluator
        log.event({
          session: sessionId,
          project,
          event: 'stop:evaluator-error',
          reason: error instanceof Error ? error.message : String(error),
          iteration: currentIteration,
        })
      }
    }

    // All evaluators passed, Claude can stop
    log.event({
      session: sessionId,
      project,
      event: 'stop:approve',
      iteration: currentIteration,
    })

    // Clear session state
    state.clear(sessionId)

    // Call onApprove callback if provided
    if (options.onApprove) {
      await options.onApprove(ctx)
    }

    outputApprove()
  }
}

export { type Evaluator, type EvaluatorContext, type EvaluatorResult, type StopHookOptions } from './types'
