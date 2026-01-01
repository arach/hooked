/**
 * Continuation state management with lazy binding.
 *
 * Two-step flow:
 * 1. User sets a "pending" objective (~/.hooked/pending.json)
 * 2. When Claude stops, the hook claims it → creates session state (~/.hooked/state/{sessionId}.json)
 */

import { existsSync, mkdirSync, writeFileSync, unlinkSync, readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const HOOKED_HOME = join(homedir(), '.hooked')
const STATE_DIR = join(HOOKED_HOME, 'state')
const PENDING_FILE = join(HOOKED_HOME, 'pending.json')
const PAUSE_FILE = join(HOOKED_HOME, 'pause')

export type ContinuationMode = 'manual' | 'check'

export interface ContinuationState {
  active: boolean
  mode: ContinuationMode
  objective?: string  // For manual mode
  check?: string      // For check mode (command to run)
  createdAt: string
  iteration: number   // How many times we've continued
  targetSession?: string  // Specific session ID to target
  targetFolder?: string   // Claude's project folder to match (e.g., Users-arach-dev-my-project)
}

function ensureDirs(): void {
  if (!existsSync(HOOKED_HOME)) {
    mkdirSync(HOOKED_HOME, { recursive: true })
  }
  if (!existsSync(STATE_DIR)) {
    mkdirSync(STATE_DIR, { recursive: true })
  }
}

// ============ Pending State (user sets before Claude claims) ============

export function getPending(): ContinuationState | null {
  if (!existsSync(PENDING_FILE)) return null
  try {
    return JSON.parse(readFileSync(PENDING_FILE, 'utf-8'))
  } catch {
    return null
  }
}

export interface PendingOptions {
  targetSession?: string
  targetFolder?: string
}

export function setPending(mode: ContinuationMode, value: string, options?: PendingOptions): ContinuationState {
  ensureDirs()
  const state: ContinuationState = {
    active: true,
    mode,
    ...(mode === 'manual' ? { objective: value } : { check: value }),
    createdAt: new Date().toISOString(),
    iteration: 0,
    targetSession: options?.targetSession,
    targetFolder: options?.targetFolder,
  }
  writeFileSync(PENDING_FILE, JSON.stringify(state, null, 2))
  return state
}

export function pendingMatchesSession(sessionId: string, projectFolder: string): boolean {
  const pending = getPending()
  if (!pending) return false

  // If pending has a specific target session, must match exactly
  if (pending.targetSession) {
    return pending.targetSession === sessionId
  }

  // If pending has a target folder, match by folder name (exact match)
  if (pending.targetFolder) {
    return pending.targetFolder === projectFolder
  }

  // No targeting - legacy behavior: any session can claim
  return true
}

export function incrementIteration(sessionId: string): number {
  const state = getSession(sessionId)
  if (!state) return 0
  state.iteration = (state.iteration || 0) + 1
  setSession(sessionId, state)
  return state.iteration
}

export function clearPending(): void {
  if (existsSync(PENDING_FILE)) {
    unlinkSync(PENDING_FILE)
  }
}

// ============ Session State (after Claude claims pending) ============

function getSessionFile(sessionId: string): string {
  return join(STATE_DIR, `${sessionId}.json`)
}

export function getSession(sessionId: string): ContinuationState | null {
  const file = getSessionFile(sessionId)
  if (!existsSync(file)) return null
  try {
    return JSON.parse(readFileSync(file, 'utf-8'))
  } catch {
    return null
  }
}

export function setSession(sessionId: string, state: ContinuationState): void {
  ensureDirs()
  writeFileSync(getSessionFile(sessionId), JSON.stringify(state, null, 2))
}

export function clearSession(sessionId: string): void {
  const file = getSessionFile(sessionId)
  if (existsSync(file)) {
    unlinkSync(file)
  }
}

export function clearAllSessions(): void {
  ensureDirs()
  if (!existsSync(STATE_DIR)) return

  const files = readdirSync(STATE_DIR).filter(f => f.endsWith('.json'))
  for (const file of files) {
    unlinkSync(join(STATE_DIR, file))
  }
}

export function getActiveSessions(): Array<{ sessionId: string; state: ContinuationState }> {
  ensureDirs()
  if (!existsSync(STATE_DIR)) return []

  const files = readdirSync(STATE_DIR).filter(f => f.endsWith('.json'))
  const sessions: Array<{ sessionId: string; state: ContinuationState }> = []

  for (const file of files) {
    const sessionId = file.replace('.json', '')
    const state = getSession(sessionId)
    if (state) {
      sessions.push({ sessionId, state })
    }
  }

  return sessions
}

// ============ Claim: move pending → session ============

export function claim(sessionId: string): ContinuationState | null {
  const pending = getPending()
  if (!pending) return null

  setSession(sessionId, pending)
  clearPending()
  return pending
}

// ============ Global Pause Flag ============

export function setPause(): void {
  ensureDirs()
  writeFileSync(PAUSE_FILE, new Date().toISOString())
}

export function isPaused(): boolean {
  return existsSync(PAUSE_FILE)
}

export function clearPause(): void {
  if (existsSync(PAUSE_FILE)) {
    unlinkSync(PAUSE_FILE)
  }
}

// ============ Export all ============

export const continuation = {
  // Pending
  getPending,
  setPending,
  clearPending,
  pendingMatchesSession,

  // Session
  getSession,
  setSession,
  clearSession,
  clearAllSessions,
  getActiveSessions,
  incrementIteration,

  // Claim
  claim,

  // Pause
  setPause,
  isPaused,
  clearPause,
}
