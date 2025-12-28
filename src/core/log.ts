import { homedir } from 'os'
import { existsSync, mkdirSync, appendFileSync, readFileSync } from 'fs'
import { join } from 'path'

export interface HookEvent {
  ts: string
  session: string
  project?: string
  event: string
  evaluator?: string
  reason?: string
  iteration?: number
  meta?: Record<string, unknown>
}

// All hooked state lives in ~/.hooked/
const HOOKED_HOME = join(homedir(), '.hooked')
const HISTORY_DIR = join(HOOKED_HOME, 'history')

function ensureDirs(): void {
  if (!existsSync(HOOKED_HOME)) {
    mkdirSync(HOOKED_HOME, { recursive: true })
  }
  if (!existsSync(HISTORY_DIR)) {
    mkdirSync(HISTORY_DIR, { recursive: true })
  }
}

function getLogFilePath(sessionId: string): string {
  const date = new Date().toISOString().split('T')[0]
  return join(HISTORY_DIR, `${date}-${sessionId}.jsonl`)
}

export function logEvent(event: Omit<HookEvent, 'ts'>): void {
  ensureDirs()

  const fullEvent: HookEvent = {
    ts: new Date().toISOString(),
    ...event,
  }

  const logFile = getLogFilePath(event.session)
  appendFileSync(logFile, JSON.stringify(fullEvent) + '\n')
}

export function getSessionEvents(sessionId: string): HookEvent[] {
  const logFile = getLogFilePath(sessionId)

  if (!existsSync(logFile)) {
    return []
  }

  const content = readFileSync(logFile, 'utf-8')
  return content
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line) as HookEvent)
}

export function getRecentEvents(limit = 50): HookEvent[] {
  ensureDirs()

  if (!existsSync(HISTORY_DIR)) {
    return []
  }

  const files = require('fs')
    .readdirSync(HISTORY_DIR)
    .filter((f: string) => f.endsWith('.jsonl'))
    .sort()
    .reverse()

  const events: HookEvent[] = []

  for (const file of files) {
    if (events.length >= limit) break

    const content = readFileSync(join(HISTORY_DIR, file), 'utf-8')
    const fileEvents = content
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line) as HookEvent)
      .reverse()

    events.push(...fileEvents)
  }

  return events.slice(0, limit)
}

export const log = {
  event: logEvent,
  getSession: getSessionEvents,
  getRecent: getRecentEvents,
}
