import { homedir } from 'os'
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'

export interface ContinuationState {
  active: boolean
  mode: 'manual' | 'check'
  objective?: string
  check?: string  // Command to run - exit 0 = done
  createdAt: string
  project?: string
}

// All hooked state lives in ~/.hooked/
const HOOKED_HOME = join(homedir(), '.hooked')
const STATE_DIR = join(HOOKED_HOME, 'state')
const CONTINUE_FILE = join(STATE_DIR, 'continuation.json')

function ensureDir(): void {
  if (!existsSync(HOOKED_HOME)) {
    mkdirSync(HOOKED_HOME, { recursive: true })
  }
  if (!existsSync(STATE_DIR)) {
    mkdirSync(STATE_DIR, { recursive: true })
  }
}

export function getContinuationState(): ContinuationState | null {
  if (!existsSync(CONTINUE_FILE)) {
    return null
  }

  try {
    const content = readFileSync(CONTINUE_FILE, 'utf-8')
    return JSON.parse(content) as ContinuationState
  } catch {
    return null
  }
}

export interface EnableOptions {
  objective?: string
  check?: string
  project?: string
}

export function enableContinuation(options: EnableOptions = {}): ContinuationState {
  ensureDir()

  const state: ContinuationState = {
    active: true,
    mode: options.check ? 'check' : 'manual',
    objective: options.objective,
    check: options.check,
    createdAt: new Date().toISOString(),
    project: options.project,
  }

  writeFileSync(CONTINUE_FILE, JSON.stringify(state, null, 2))
  return state
}

export function disableContinuation(): void {
  if (existsSync(CONTINUE_FILE)) {
    unlinkSync(CONTINUE_FILE)
  }
}

export function isActive(): boolean {
  const state = getContinuationState()
  return state?.active ?? false
}

export const continuation = {
  get: getContinuationState,
  enable: enableContinuation,
  disable: disableContinuation,
  isActive,
}
