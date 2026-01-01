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
import { log, registerSession } from './core/log'
import { renderTemplate } from './core/config'
import { project } from './core/project'
import { history } from './core/history'

interface StopPayload {
  session_id: string
  transcript_path?: string
  [key: string]: unknown
}

interface StopDecision {
  decision: 'block' | 'approve'
  reason?: string
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
  const projectFolder = project.extractFolder(payload.transcript_path || '') || 'unknown'
  const displayName = project.getDisplayNameFromFolder(projectFolder)

  if (!sessionId) {
    console.error('[hooked:stop] No session_id in payload')
    output({ decision: 'approve', reason: 'No session_id' })
    return
  }

  // Register this session in the registry (for project → session lookups)
  if (projectFolder !== 'unknown') {
    registerSession(sessionId, projectFolder, displayName)
  }

  // Step 1: Check for pending and claim it (only if it targets this session/folder)
  const pending = continuation.getPending()
  if (pending && continuation.pendingMatchesSession(sessionId, projectFolder)) {
    continuation.claim(sessionId, displayName)
    log.event({
      session: sessionId,
      project: displayName,
      event: 'claimed',
      evaluator: pending.mode,
      meta: { objective: pending.objective, check: pending.check }
    })
    const goal = pending.mode === 'manual' ? pending.objective : pending.check
    await speak(renderTemplate('loopStarted', { project: displayName, goal: goal || '' }), { sessionId })
    console.error(`[hooked:stop] Claimed pending loop for session ${sessionId}`)
  } else if (pending) {
    // Pending exists but doesn't match this session - log and skip
    const target = pending.targetSession?.slice(0, 8) || pending.targetFolder?.slice(-15) || 'any'
    console.error(`[hooked:stop] Pending exists for ${target}, skipping (this session: ${sessionId.slice(0, 8)}/${displayName})`)
  }

  // Step 2: Check for bound session
  const state = continuation.getSession(sessionId)

  if (!state) {
    // No loop for this session - approve normally
    output({ decision: 'approve', reason: 'No loop active' })
    return
  }

  // Step 3: Check for global pause
  if (continuation.isPaused()) {
    continuation.clearSession(sessionId, 'Paused by user', displayName)
    continuation.clearPause()
    log.event({
      session: sessionId,
      project: displayName,
      event: 'paused',
      evaluator: state.mode
    })
    await speak(renderTemplate('pausing', { project: displayName }), { sessionId })
    output({ decision: 'approve', reason: 'Paused by user request' })
    return
  }

  // Step 4: Evaluate based on mode
  if (state.mode === 'check' && state.check) {
    const passed = await runCheck(state.check)

    if (passed) {
      continuation.clearSession(sessionId, 'Check passed', displayName)
      log.event({
        session: sessionId,
        project: displayName,
        event: 'completed',
        evaluator: 'check',
        reason: 'Check passed'
      })

      // Log to history
      history.log({
        type: 'continuation',
        project: displayName,
        session_id: sessionId,
        hook_event_name: 'check_passed',
        message: `Check passed: ${state.check}`,
        payload: { check: state.check, decision: 'approve' },
      })

      await speak(renderTemplate('checkPassed', { project: displayName }), { sessionId })
      output({ decision: 'approve', reason: 'Check passed' })
    } else {
      log.event({
        session: sessionId,
        project: displayName,
        event: 'blocked',
        evaluator: 'check',
        reason: 'Check failed'
      })

      // Log to history
      history.log({
        type: 'continuation',
        project: displayName,
        session_id: sessionId,
        hook_event_name: 'check_failed',
        message: `Check failed: ${state.check}`,
        payload: { check: state.check, decision: 'block' },
      })

      await speak(renderTemplate('checkFailed', { project: displayName }), { sessionId })
      output({ decision: 'block', reason: `Check failed: ${state.check}` })
    }
    return
  }

  // Manual mode - always block until user says off/pause
  const round = continuation.incrementIteration(sessionId)
  log.event({
    session: sessionId,
    project: displayName,
    event: 'blocked',
    evaluator: 'manual',
    iteration: round,
    meta: { objective: state.objective }
  })

  // Log to history
  history.log({
    type: 'continuation',
    project: displayName,
    session_id: sessionId,
    hook_event_name: 'manual_blocked',
    message: `Round ${round}: ${state.objective}`,
    payload: { objective: state.objective, round, decision: 'block' },
  })

  await speak(renderTemplate('manualRound', { project: displayName, round, objective: state.objective || '' }), { sessionId })
  output({ decision: 'block', reason: `Round ${round}: ${state.objective}` })
}

main().catch(error => {
  console.error('[hooked:stop] Fatal error:', error)
  output({ decision: 'approve', reason: 'Hook error' })
  process.exit(1)
})
