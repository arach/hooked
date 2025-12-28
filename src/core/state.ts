import { homedir } from 'os'
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'

export interface SessionState {
  sessionId: string
  iteration: number
  startedAt: string
  lastUpdatedAt: string
  project?: string
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

export const state = {
  get: getSessionState,
  increment: incrementIteration,
  clear: clearSessionState,
  getIteration,
}
