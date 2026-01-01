import { homedir } from 'os'
import { existsSync, mkdirSync, appendFileSync, readFileSync, writeFileSync, readdirSync } from 'fs'
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

export interface SessionInfo {
  sessionId: string
  projectFolder: string  // Claude's encoded folder name (e.g., Users-arach-dev-my-project)
  displayName: string    // Human-friendly name for voice/display
  lastSeen: string
}

// All hooked state lives in ~/.hooked/
const HOOKED_HOME = join(homedir(), '.hooked')
const HISTORY_DIR = join(HOOKED_HOME, 'history')
const REGISTRY_FILE = join(HOOKED_HOME, 'sessions.json')

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

  const files = readdirSync(HISTORY_DIR)
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

// ============ Session Registry ============

type SessionRegistry = Record<string, SessionInfo>

function getRegistry(): SessionRegistry {
  if (!existsSync(REGISTRY_FILE)) return {}
  try {
    return JSON.parse(readFileSync(REGISTRY_FILE, 'utf-8'))
  } catch {
    return {}
  }
}

function saveRegistry(registry: SessionRegistry): void {
  ensureDirs()
  writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2))
}

export function registerSession(sessionId: string, projectFolder: string, displayName: string): void {
  const registry = getRegistry()
  registry[sessionId] = {
    sessionId,
    projectFolder,
    displayName,
    lastSeen: new Date().toISOString(),
  }
  saveRegistry(registry)
}

export function getSessionByFolder(projectFolder: string): SessionInfo | null {
  const registry = getRegistry()

  // Find sessions matching this project folder, prefer most recent
  const matches = Object.values(registry)
    .filter(s => s.projectFolder === projectFolder)
    .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))

  return matches[0] || null
}

export function getAllSessions(): SessionInfo[] {
  const registry = getRegistry()
  return Object.values(registry)
    .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))
}

export function clearStaleSessionsFromRegistry(maxAgeMs = 24 * 60 * 60 * 1000): void {
  const registry = getRegistry()
  const now = Date.now()

  for (const [sessionId, info] of Object.entries(registry)) {
    const age = now - new Date(info.lastSeen).getTime()
    if (age > maxAgeMs) {
      delete registry[sessionId]
    }
  }

  saveRegistry(registry)
}

export const log = {
  event: logEvent,
  getSession: getSessionEvents,
  getRecent: getRecentEvents,
  registerSession,
  getSessionByFolder,
  getAllSessions,
  clearStaleSessions: clearStaleSessionsFromRegistry,
}
