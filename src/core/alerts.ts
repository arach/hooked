/**
 * Pending alerts tracking.
 *
 * Alerts are set on Notification hook and cleared on UserPromptSubmit.
 * A background reminder process checks for stale alerts and re-announces.
 */

import { existsSync, readFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { history } from './history'
import { writeFileAtomic } from './fs'

const HOOKED_HOME = join(homedir(), '.hooked')
const ALERTS_FILE = join(HOOKED_HOME, 'pending-alerts.json')

export interface PendingAlert {
  sessionId: string
  project: string
  cwd?: string           // Full path to project directory
  type: string           // 'permission', 'error', 'input', etc.
  message: string
  timestamp: string
  reminders: number      // How many times we've reminded
  reminderPid?: number   // PID of background reminder process
}

export type AlertsRegistry = Record<string, PendingAlert>  // keyed by sessionId

function getAlerts(): AlertsRegistry {
  if (!existsSync(ALERTS_FILE)) return {}
  try {
    return JSON.parse(readFileSync(ALERTS_FILE, 'utf-8'))
  } catch {
    return {}
  }
}

function saveAlerts(alerts: AlertsRegistry): void {
  if (Object.keys(alerts).length === 0) {
    // Clean up file if no alerts
    if (existsSync(ALERTS_FILE)) {
      unlinkSync(ALERTS_FILE)
    }
    return
  }
  writeFileAtomic(ALERTS_FILE, JSON.stringify(alerts, null, 2))
}

export function setAlert(alert: Omit<PendingAlert, 'timestamp' | 'reminders'>): PendingAlert {
  const alerts = getAlerts()
  const fullAlert: PendingAlert = {
    ...alert,
    timestamp: new Date().toISOString(),
    reminders: 0,
  }
  alerts[alert.sessionId] = fullAlert
  saveAlerts(alerts)

  // Log to history
  history.log({
    type: 'alert_set',
    project: alert.project,
    session_id: alert.sessionId,
    message: alert.message,
    payload: { alert_type: alert.type },
  })

  return fullAlert
}

export function getAlert(sessionId: string): PendingAlert | null {
  const alerts = getAlerts()
  return alerts[sessionId] || null
}

export function getAllAlerts(): PendingAlert[] {
  return Object.values(getAlerts())
}

export function clearAlert(sessionId: string, reason: string = 'user_activity'): boolean {
  const alerts = getAlerts()
  const alert = alerts[sessionId]
  if (!alert) return false

  // Log to history before clearing
  history.log({
    type: 'alert_cleared',
    project: alert.project,
    session_id: sessionId,
    message: `Alert cleared: ${reason}`,
    payload: {
      alert_type: alert.type,
      age_minutes: getAlertAgeMinutes(alert),
      reminders_sent: alert.reminders,
      reason,
    },
  })

  delete alerts[sessionId]
  saveAlerts(alerts)
  return true
}

export function clearAllAlerts(): { killed: number[] } {
  const currentAlerts = getAlerts()
  const killed: number[] = []

  // Kill all reminder processes
  for (const alert of Object.values(currentAlerts)) {
    if (alert.reminderPid) {
      try {
        process.kill(alert.reminderPid)
        killed.push(alert.reminderPid)
      } catch {
        // Process already dead, ignore
      }
    }
  }

  saveAlerts({})
  return { killed }
}

export function incrementReminder(sessionId: string): number {
  const alerts = getAlerts()
  if (!alerts[sessionId]) return 0
  alerts[sessionId].reminders += 1
  saveAlerts(alerts)
  return alerts[sessionId].reminders
}

export function setReminderPid(sessionId: string, pid: number): void {
  const alerts = getAlerts()
  if (!alerts[sessionId]) return
  alerts[sessionId].reminderPid = pid
  saveAlerts(alerts)
}

export function getAlertAge(alert: PendingAlert): number {
  return Date.now() - new Date(alert.timestamp).getTime()
}

export function getAlertAgeMinutes(alert: PendingAlert): number {
  return Math.floor(getAlertAge(alert) / 60000)
}

export const alerts = {
  set: setAlert,
  get: getAlert,
  getAll: getAllAlerts,
  clear: clearAlert,
  clearAll: clearAllAlerts,
  incrementReminder,
  setReminderPid,
  getAge: getAlertAge,
  getAgeMinutes: getAlertAgeMinutes,
}
