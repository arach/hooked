#!/usr/bin/env node

import { log } from '../core/log'
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

// Simple iteration tracking (in-memory, resets per hook invocation)
let iteration = 0

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

    // Track iterations
    if (!stopHookActive) {
      iteration = 1
    } else {
      iteration++
    }

    const ctx: EvaluatorContext = {
      input,
      iteration,
      project,
    }

    // Run all evaluators
    for (const evaluator of evaluators) {
      try {
        const result = await evaluator(ctx)

        if (result.shouldContinue) {
          log.event({
            session: sessionId,
            project,
            event: 'stop:block',
            reason: result.reason,
            iteration,
          })

          // Call onBlock callback if provided
          if (options.onBlock) {
            await options.onBlock({ ...ctx, reason: result.reason })
          }

          // Provide feedback to Claude
          console.error(`[Iteration ${iteration}] ${result.reason}`)

          outputBlock(result.reason)
          return
        }
      } catch (error) {
        log.event({
          session: sessionId,
          project,
          event: 'stop:evaluator-error',
          reason: error instanceof Error ? error.message : String(error),
          iteration,
        })
      }
    }

    // All evaluators passed, Claude can stop
    log.event({
      session: sessionId,
      project,
      event: 'stop:approve',
      iteration,
    })

    // Call onApprove callback if provided
    if (options.onApprove) {
      await options.onApprove(ctx)
    }

    outputApprove()
  }
}

export { type Evaluator, type EvaluatorContext, type EvaluatorResult, type StopHookOptions } from './types'
