import { homedir } from 'os'
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'

export interface SessionState {
  sessionId: string
  iteration: number
  startedAt: string
  lastUpdatedAt: string
  project?: string
  // Session-specific continuation
  activePreset?: string | null
  objective?: string | null
}

export interface PendingActivation {
  preset: string
  objective?: string
  createdAt: string
}

// All hooked state lives in ~/.hooked/
const HOOKED_HOME = join(homedir(), '.hooked')
const STATE_DIR = join(HOOKED_HOME, 'state')

function ensureDirs(): void {
  if (!existsSync(HOOKED_HOME)) {
    mkdirSync(HOOKED_HOME, { recursive: true })
  }
  if (!existsSync(STATE_DIR)) {
    mkdirSync(STATE_DIR, { recursive: true })
  }
}

function getStateFilePath(sessionId: string): string {
  return join(STATE_DIR, `${sessionId}.json`)
}

export function getSessionState(sessionId: string): SessionState | null {
  const stateFile = getStateFilePath(sessionId)

  if (!existsSync(stateFile)) {
    return null
  }

  try {
    const content = readFileSync(stateFile, 'utf-8')
    return JSON.parse(content) as SessionState
  } catch {
    return null
  }
}

export function incrementIteration(sessionId: string, project?: string): SessionState {
  ensureDirs()

  const existing = getSessionState(sessionId)
  const now = new Date().toISOString()

  const state: SessionState = existing
    ? {
        ...existing,
        iteration: existing.iteration + 1,
        lastUpdatedAt: now,
      }
    : {
        sessionId,
        iteration: 1,
        startedAt: now,
        lastUpdatedAt: now,
        project,
      }

  const stateFile = getStateFilePath(sessionId)
  writeFileSync(stateFile, JSON.stringify(state, null, 2))

  return state
}

export function clearSessionState(sessionId: string): void {
  const stateFile = getStateFilePath(sessionId)

  if (existsSync(stateFile)) {
    unlinkSync(stateFile)
  }
}

export function getIteration(sessionId: string): number {
  const state = getSessionState(sessionId)
  return state?.iteration ?? 0
}

// Pending activation management
const PENDING_FILE = join(HOOKED_HOME, 'pending.json')

export function setPendingActivation(preset: string, objective?: string): PendingActivation {
  ensureDirs()
  const pending: PendingActivation = {
    preset,
    objective,
    createdAt: new Date().toISOString(),
  }
  writeFileSync(PENDING_FILE, JSON.stringify(pending, null, 2))
  return pending
}

export function getPendingActivation(): PendingActivation | null {
  if (!existsSync(PENDING_FILE)) {
    return null
  }
  try {
    const content = readFileSync(PENDING_FILE, 'utf-8')
    return JSON.parse(content) as PendingActivation
  } catch {
    return null
  }
}

export function clearPendingActivation(): void {
  if (existsSync(PENDING_FILE)) {
    unlinkSync(PENDING_FILE)
  }
}

export function claimPendingActivation(sessionId: string, project?: string): SessionState | null {
  const pending = getPendingActivation()
  if (!pending) {
    return null
  }

  // Bind the pending activation to this session
  const existing = getSessionState(sessionId)
  const now = new Date().toISOString()

  const sessionState: SessionState = existing
    ? {
        ...existing,
        activePreset: pending.preset,
        objective: pending.objective,
        lastUpdatedAt: now,
      }
    : {
        sessionId,
        iteration: 0,
        startedAt: now,
        lastUpdatedAt: now,
        project,
        activePreset: pending.preset,
        objective: pending.objective,
      }

  const stateFile = getStateFilePath(sessionId)
  writeFileSync(stateFile, JSON.stringify(sessionState, null, 2))

  // Clear the pending activation
  clearPendingActivation()

  return sessionState
}

export function setSessionPreset(sessionId: string, preset: string | null, objective?: string): SessionState {
  ensureDirs()
  const existing = getSessionState(sessionId)
  const now = new Date().toISOString()

  const sessionState: SessionState = existing
    ? {
        ...existing,
        activePreset: preset,
        objective: objective ?? existing.objective,
        lastUpdatedAt: now,
      }
    : {
        sessionId,
        iteration: 0,
        startedAt: now,
        lastUpdatedAt: now,
        activePreset: preset,
        objective,
      }

  const stateFile = getStateFilePath(sessionId)
  writeFileSync(stateFile, JSON.stringify(sessionState, null, 2))
  return sessionState
}

export function getSessionPreset(sessionId: string): string | null {
  const sessionState = getSessionState(sessionId)
  return sessionState?.activePreset ?? null
}

export const state = {
  get: getSessionState,
  increment: incrementIteration,
  clear: clearSessionState,
  getIteration,
  // Pending activation
  setPending: setPendingActivation,
  getPending: getPendingActivation,
  clearPending: clearPendingActivation,
  claimPending: claimPendingActivation,
  // Session preset
  setPreset: setSessionPreset,
  getPreset: getSessionPreset,
}
