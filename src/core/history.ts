/**
 * Event history - SQLite database of all hooked events.
 *
 * Stores events in ~/.hooked/history.sqlite
 * Full Claude metadata stored as JSON in the payload column.
 */

import Database from 'better-sqlite3'
import { join } from 'path'
import { homedir } from 'os'
import { existsSync, mkdirSync } from 'fs'

const HOOKED_HOME = join(homedir(), '.hooked')
const DB_PATH = join(HOOKED_HOME, 'history.sqlite')

export type EventType = 'notification' | 'stop' | 'alert_set' | 'alert_cleared' | 'reminder' | 'continuation' | 'command' | 'spoken'

export interface HistoryEvent {
  id?: number
  timestamp: string
  type: EventType
  project: string
  session_id?: string
  hook_event_name?: string
  message?: string
  payload?: Record<string, unknown>  // Full Claude metadata as JSON
}

export interface StoredEvent extends HistoryEvent {
  id: number
}

let db: Database.Database | null = null

function getDb(): Database.Database {
  if (db) return db

  // Ensure directory exists
  if (!existsSync(HOOKED_HOME)) {
    mkdirSync(HOOKED_HOME, { recursive: true })
  }

  db = new Database(DB_PATH)

  // Create table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      type TEXT NOT NULL,
      project TEXT NOT NULL,
      session_id TEXT,
      hook_event_name TEXT,
      message TEXT,
      payload TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_events_project ON events(project);
    CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
  `)

  return db
}

/**
 * Log an event to history.
 */
export function logEvent(event: Omit<HistoryEvent, 'id' | 'timestamp'>): StoredEvent {
  const db = getDb()

  const stmt = db.prepare(`
    INSERT INTO events (timestamp, type, project, session_id, hook_event_name, message, payload)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const timestamp = new Date().toISOString()
  const result = stmt.run(
    timestamp,
    event.type,
    event.project,
    event.session_id || null,
    event.hook_event_name || null,
    event.message || null,
    event.payload ? JSON.stringify(event.payload) : null
  )

  return {
    id: result.lastInsertRowid as number,
    timestamp,
    ...event,
  }
}

function parseRow(row: Record<string, unknown>): StoredEvent {
  return {
    id: row.id as number,
    timestamp: row.timestamp as string,
    type: row.type as EventType,
    project: row.project as string,
    session_id: row.session_id as string | undefined,
    hook_event_name: row.hook_event_name as string | undefined,
    message: row.message as string | undefined,
    payload: row.payload ? JSON.parse(row.payload as string) : undefined,
  }
}

/**
 * Get recent events.
 */
export function getRecent(limit: number = 50): StoredEvent[] {
  const db = getDb()
  const stmt = db.prepare(`
    SELECT * FROM events ORDER BY timestamp DESC LIMIT ?
  `)
  return stmt.all(limit).map(row => parseRow(row as Record<string, unknown>))
}

/**
 * Get events for a specific project.
 */
export function getByProject(project: string, limit: number = 50): StoredEvent[] {
  const db = getDb()
  const stmt = db.prepare(`
    SELECT * FROM events WHERE project = ? ORDER BY timestamp DESC LIMIT ?
  `)
  return stmt.all(project, limit).map(row => parseRow(row as Record<string, unknown>))
}

/**
 * Get events for a specific session.
 */
export function getBySession(sessionId: string, limit: number = 100): StoredEvent[] {
  const db = getDb()
  const stmt = db.prepare(`
    SELECT * FROM events WHERE session_id = ? ORDER BY timestamp DESC LIMIT ?
  `)
  return stmt.all(sessionId, limit).map(row => parseRow(row as Record<string, unknown>))
}

/**
 * Get events by type.
 */
export function getByType(type: EventType, limit: number = 50): StoredEvent[] {
  const db = getDb()
  const stmt = db.prepare(`
    SELECT * FROM events WHERE type = ? ORDER BY timestamp DESC LIMIT ?
  `)
  return stmt.all(type, limit).map(row => parseRow(row as Record<string, unknown>))
}

/**
 * Get events in a date range.
 */
export function getByDateRange(start: Date, end: Date, limit: number = 500): StoredEvent[] {
  const db = getDb()
  const stmt = db.prepare(`
    SELECT * FROM events
    WHERE timestamp >= ? AND timestamp <= ?
    ORDER BY timestamp DESC LIMIT ?
  `)
  return stmt.all(start.toISOString(), end.toISOString(), limit)
    .map(row => parseRow(row as Record<string, unknown>))
}

/**
 * Get event counts by project.
 */
export function getProjectStats(): { project: string; count: number }[] {
  const db = getDb()
  const stmt = db.prepare(`
    SELECT project, COUNT(*) as count
    FROM events
    GROUP BY project
    ORDER BY count DESC
  `)
  return stmt.all() as { project: string; count: number }[]
}

/**
 * Get total event count.
 */
export function getCount(): number {
  const db = getDb()
  const stmt = db.prepare('SELECT COUNT(*) as count FROM events')
  const result = stmt.get() as { count: number }
  return result.count
}

/**
 * Search events by message content.
 */
export function search(query: string, limit: number = 50): StoredEvent[] {
  const db = getDb()
  const stmt = db.prepare(`
    SELECT * FROM events
    WHERE message LIKE ? OR payload LIKE ?
    ORDER BY timestamp DESC LIMIT ?
  `)
  const pattern = `%${query}%`
  return stmt.all(pattern, pattern, limit).map(row => parseRow(row as Record<string, unknown>))
}

/**
 * Export all events to JSON.
 */
export function exportToJson(): string {
  const db = getDb()
  const stmt = db.prepare('SELECT * FROM events ORDER BY timestamp ASC')
  const events = stmt.all().map(row => parseRow(row as Record<string, unknown>))
  return JSON.stringify(events, null, 2)
}

/**
 * Export all events to CSV.
 */
export function exportToCsv(): string {
  const db = getDb()
  const stmt = db.prepare('SELECT * FROM events ORDER BY timestamp ASC')
  const events = stmt.all().map(row => parseRow(row as Record<string, unknown>))

  const headers = ['id', 'timestamp', 'type', 'project', 'session_id', 'hook_event_name', 'message', 'payload']
  const rows = events.map(e => [
    e.id,
    e.timestamp,
    e.type,
    e.project,
    e.session_id || '',
    e.hook_event_name || '',
    (e.message || '').replace(/"/g, '""'),
    e.payload ? JSON.stringify(e.payload).replace(/"/g, '""') : '',
  ])

  const csvRows = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ]
  return csvRows.join('\n')
}

/**
 * Delete events older than N days.
 */
export function deleteOlderThan(days: number): number {
  const db = getDb()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  const stmt = db.prepare('DELETE FROM events WHERE timestamp < ?')
  const result = stmt.run(cutoff.toISOString())
  return result.changes
}

/**
 * Vacuum the database to reclaim space.
 */
export function vacuum(): void {
  const db = getDb()
  db.exec('VACUUM')
}

export const history = {
  log: logEvent,
  getRecent,
  getByProject,
  getBySession,
  getByType,
  getByDateRange,
  getProjectStats,
  getCount,
  search,
  exportToJson,
  exportToCsv,
  deleteOlderThan,
  vacuum,
}
