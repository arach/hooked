#!/usr/bin/env node
/**
 * Stop Hook - Lazy binding with voice announcements
 *
 * Flow:
 * 1. Read stdin for session_id
 * 2. Check for pending → claim it if exists
 * 3. Check for session state → evaluate if exists
 * 4. Output JSON decision: { "decision": "block" | "approve", "reason": "..." }
 */

import { execSync } from 'child_process'
import { continuation } from './continuation'
import { speak } from './core/speak'
import { log } from './core/log'

interface StopPayload {
  session_id: string
  transcript_path?: string
  [key: string]: unknown
}

interface StopDecision {
  decision: 'block' | 'approve'
  reason?: string
}

// Derive project name from transcript path for announcements
function deriveProjectName(transcriptPath?: string): string {
  if (!transcriptPath) return 'session'

  const dashedMatch = transcriptPath.match(/projects\/[^/]*-([^/]+)\//)
  if (dashedMatch?.[1]) {
    return dashedMatch[1].replace(/-/g, ' ')
  }

  const plainMatch = transcriptPath.match(/projects\/([^/]+)\//)
  if (plainMatch?.[1]) {
    return plainMatch[1].replace(/-/g, ' ').replace(/\./g, ' dot ')
  }

  return 'session'
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', chunk => { data += chunk })
    process.stdin.on('end', () => resolve(data))
    process.stdin.on('error', reject)
  })
}

function output(decision: StopDecision): void {
  console.log(JSON.stringify(decision))
}

async function runCheck(command: string): Promise<boolean> {
  try {
    execSync(command, { stdio: 'pipe', timeout: 60000 })
    return true
  } catch {
    return false
  }
}

async function main(): Promise<void> {
  let payload: StopPayload

  try {
    const raw = await readStdin()
    payload = JSON.parse(raw)
  } catch (error) {
    console.error('[hooked:stop] Failed to parse stdin:', error)
    output({ decision: 'approve', reason: 'Failed to parse payload' })
    return
  }

  const sessionId = payload.session_id
  const project = deriveProjectName(payload.transcript_path)

  if (!sessionId) {
    console.error('[hooked:stop] No session_id in payload')
    output({ decision: 'approve', reason: 'No session_id' })
    return
  }

  // Step 1: Check for pending and claim it
  const pending = continuation.getPending()
  if (pending) {
    continuation.claim(sessionId)
    log.event({
      session: sessionId,
      project,
      event: 'claimed',
      evaluator: pending.mode,
      meta: { objective: pending.objective, check: pending.check }
    })
    const goal = pending.mode === 'manual' ? pending.objective : pending.check
    await speak(`In ${project}, continuation started. ${goal}`)
    console.error(`[hooked:stop] Claimed pending continuation for session ${sessionId}`)
  }

  // Step 2: Check for bound session
  const state = continuation.getSession(sessionId)

  if (!state) {
    // No continuation for this session - approve normally
    output({ decision: 'approve', reason: 'No continuation active' })
    return
  }

  // Step 3: Check for global pause
  if (continuation.isPaused()) {
    continuation.clearSession(sessionId)
    continuation.clearPause()
    log.event({
      session: sessionId,
      project,
      event: 'paused',
      evaluator: state.mode
    })
    await speak(`In ${project}, pausing as requested. Continuation cleared.`)
    output({ decision: 'approve', reason: 'Paused by user request' })
    return
  }

  // Step 4: Evaluate based on mode
  if (state.mode === 'check' && state.check) {
    const passed = await runCheck(state.check)

    if (passed) {
      continuation.clearSession(sessionId)
      log.event({
        session: sessionId,
        project,
        event: 'completed',
        evaluator: 'check',
        reason: 'Check passed'
      })
      await speak(`In ${project}, check passed. Continuation complete.`)
      output({ decision: 'approve', reason: 'Check passed' })
    } else {
      log.event({
        session: sessionId,
        project,
        event: 'blocked',
        evaluator: 'check',
        reason: 'Check failed'
      })
      await speak(`In ${project}, check failed. Keep working.`)
      output({ decision: 'block', reason: `Check failed: ${state.check}` })
    }
    return
  }

  // Manual mode - always block until user says off/pause
  const round = continuation.incrementIteration(sessionId)
  log.event({
    session: sessionId,
    project,
    event: 'blocked',
    evaluator: 'manual',
    iteration: round,
    meta: { objective: state.objective }
  })
  await speak(`In ${project}, round ${round}. Objective: ${state.objective}`)
  output({ decision: 'block', reason: `Round ${round}: ${state.objective}` })
}

main().catch(error => {
  console.error('[hooked:stop] Fatal error:', error)
  output({ decision: 'approve', reason: 'Hook error' })
  process.exit(1)
})
