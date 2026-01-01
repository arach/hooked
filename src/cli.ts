#!/usr/bin/env node
/**
 * Hooked CLI
 *
 * hooked enhances Claude Code with:
 *   - Voice announcements when Claude completes tasks
 *   - Session-scoped "until" loops to keep Claude working
 *
 * Commands:
 *   status                Show current state
 *   speak on|off          Toggle voice announcements
 *   until "objective"     Keep working toward objective
 *   until check "cmd"     Keep working until command passes
 *   until off             Clear all until loops
 *   until pause           Stop after next cycle
 */

import { continuation } from './continuation'
import { config, renderTemplate } from './core/config'
import { speak } from './core/speak'
import { log } from './core/log'
import { project } from './core/project'
import { alerts } from './core/alerts'
import { history } from './core/history'

const [, , command, ...args] = process.argv

// Get current project folder (matches Claude's encoding)
function getCurrentProjectFolder(): string {
  return project.pathToFolder(process.cwd())
}

// Get display name for voice/output
function getCurrentDisplayName(): string {
  return project.getDisplayName(process.cwd())
}

// Look up session for current project
function getCurrentSession(): { sessionId: string; projectFolder: string; displayName: string } | null {
  const folder = getCurrentProjectFolder()
  return log.getSessionByFolder(folder)
}

function showHelp(): void {
  console.log(`
hooked - Voice & until loops for Claude Code

Commands:
  status                Show current state

History:
  history [n]           Show recent events (default: 20)
  history stats         Show event counts by project
  history search <q>    Search events
  history export [json|csv]  Export all events
  history prune [days]  Delete events older than N days (default: 30)
  history --full        Include full Claude payload

Speak:
  speak on|off          Toggle voice announcements

Until:
  until "objective"     Keep working toward objective
  until check "cmd"     Keep working until command passes
  until off             Clear all until loops
  until pause           Stop after next cycle

Examples:
  hooked status
  hooked history 50
  hooked history export json > backup.json
  hooked history prune 90
  hooked speak off
  hooked until "implement auth system"
  hooked until check "pnpm test"
  hooked off
`)
}

function handleSpeak(): void {
  const value = args[0]?.toLowerCase()

  if (value === 'on' || value === 'true' || value === '1') {
    config.setVoiceEnabled(true)
    console.log('Voice: ON')
  } else if (value === 'off' || value === 'false' || value === '0') {
    config.setVoiceEnabled(false)
    console.log('Voice: OFF')
  } else if (value && !isNaN(parseFloat(value))) {
    // Set volume (0.0 to 1.0)
    const volume = parseFloat(value)
    config.setVoiceVolume(volume)
    console.log(`Voice volume: ${Math.round(volume * 100)}%`)
  } else {
    const enabled = config.isVoiceEnabled()
    const volume = config.getVoiceVolume()
    console.log(`Voice: ${enabled ? 'ON' : 'OFF'}`)
    console.log(`Volume: ${Math.round(volume * 100)}%`)
    console.log('\nUsage:')
    console.log('  hooked speak on|off    Toggle voice')
    console.log('  hooked speak 0.5       Set volume (0.0-1.0)')
  }
}

async function handleUntil(): Promise<void> {
  const subcommand = args[0]

  if (!subcommand) {
    // Show until status
    const pending = continuation.getPending()
    const sessions = continuation.getActiveSessions()
    const paused = continuation.isPaused()

    console.log('=== Until ===\n')

    if (paused) {
      console.log('PAUSED: Will stop after next cycle\n')
    }

    if (pending) {
      console.log('Pending (waiting to be claimed):')
      console.log(`  Mode: ${pending.mode}`)
      if (pending.objective) console.log(`  Objective: ${pending.objective}`)
      if (pending.check) console.log(`  Check: ${pending.check}`)
      console.log()
    }

    if (sessions.length > 0) {
      console.log(`Active sessions (${sessions.length}):`)
      for (const { sessionId, state } of sessions) {
        console.log(`  ${sessionId.slice(0, 8)}... - ${state.mode}`)
        if (state.objective) console.log(`    ${state.objective}`)
        if (state.check) console.log(`    ${state.check}`)
      }
      console.log()
    }

    if (!pending && sessions.length === 0 && !paused) {
      console.log('No active until loops.')
    }
    return
  }

  // Handle subcommands
  switch (subcommand) {
    case 'off':
      continuation.clearPending()
      continuation.clearAllSessions()
      continuation.clearPause()
      console.log('All until loops cleared.')
      await speak(renderTemplate('missionComplete', {}))
      break

    case 'pause':
      continuation.setPause()
      console.log('Pause requested.')
      console.log('Active loop will complete its current cycle then stop.')
      break

    case 'check': {
      const checkCmd = args.slice(1).join(' ')
      if (!checkCmd) {
        console.error('Error: check command required')
        console.error('Usage: hooked until check "pnpm test"')
        process.exit(1)
      }

      // Try to target specific session, fallback to project folder
      const session = getCurrentSession()
      const folder = getCurrentProjectFolder()
      const displayName = getCurrentDisplayName()
      const state = continuation.setPending('check', checkCmd, {
        targetSession: session?.sessionId,
        targetFolder: session ? undefined : folder,
      })

      console.log('Until loop pending.')
      console.log(`Mode: check`)
      console.log(`Command: ${state.check}`)
      if (session) {
        console.log(`Target: session ${session.sessionId.slice(0, 8)}... (${displayName})`)
      } else {
        console.log(`Target: project "${displayName}" (no active session yet)`)
      }
      break
    }

    default: {
      // Treat as objective
      const objective = [subcommand, ...args.slice(1)].join(' ')

      // Try to target specific session, fallback to project folder
      const session = getCurrentSession()
      const folder = getCurrentProjectFolder()
      const displayName = getCurrentDisplayName()
      const state = continuation.setPending('manual', objective, {
        targetSession: session?.sessionId,
        targetFolder: session ? undefined : folder,
      })

      console.log('Until loop pending.')
      console.log(`Mode: manual`)
      console.log(`Objective: ${state.objective}`)
      if (session) {
        console.log(`Target: session ${session.sessionId.slice(0, 8)}... (${displayName})`)
      } else {
        console.log(`Target: project "${displayName}" (no active session yet)`)
      }
    }
  }
}

function handleStatus(): void {
  const cfg = config.get()
  const pending = continuation.getPending()
  const activeSessions = continuation.getActiveSessions()
  const paused = continuation.isPaused()
  const registeredSessions = log.getAllSessions()
  const pendingAlerts = alerts.getAll()

  console.log('=== Hooked Status ===\n')

  // Current context
  const displayName = getCurrentDisplayName()
  const currentSession = getCurrentSession()
  console.log('Context:')
  console.log(`  Project: ${displayName}`)
  if (currentSession) {
    console.log(`  Session: ${currentSession.sessionId.slice(0, 8)}...`)
  } else {
    console.log(`  Session: (none registered)`)
  }
  console.log()

  // Voice section
  console.log('Voice:')
  console.log(`  Enabled: ${cfg.voice.enabled ? 'ON' : 'OFF'}`)
  console.log(`  Volume: ${Math.round(cfg.voice.volume * 100)}%`)
  console.log()

  // Alerts section
  console.log('Alerts:')
  console.log(`  Reminders: ${cfg.alerts.enabled ? 'ON' : 'OFF'}`)
  if (cfg.alerts.enabled) {
    console.log(`  Remind every: ${cfg.alerts.reminderMinutes}m`)
    console.log(`  Max reminders: ${cfg.alerts.maxReminders}`)
    console.log(`  Escalate after: ${cfg.alerts.escalateAfter} reminders`)
  }
  if (pendingAlerts.length > 0) {
    console.log(`  Pending (${pendingAlerts.length}):`)
    for (const alert of pendingAlerts) {
      const age = alerts.getAgeMinutes(alert)
      console.log(`    ${alert.project}: ${alert.type} (${age}m, ${alert.reminders} reminders)`)
    }
  }
  console.log()

  // Until section
  console.log('Until:')

  if (paused) {
    console.log('  PAUSED: Will stop after next cycle')
  }

  if (pending) {
    console.log('  Pending:')
    console.log(`    Mode: ${pending.mode}`)
    if (pending.objective) console.log(`    Objective: ${pending.objective}`)
    if (pending.check) console.log(`    Check: ${pending.check}`)
    if (pending.targetSession) {
      console.log(`    Target: session ${pending.targetSession.slice(0, 8)}...`)
    } else if (pending.targetFolder) {
      console.log(`    Target: folder ${pending.targetFolder.slice(-20)}...`)
    } else {
      console.log(`    Target: any session (legacy)`)
    }
  }

  if (activeSessions.length > 0) {
    console.log(`  Active loops (${activeSessions.length}):`)
    for (const { sessionId, state } of activeSessions) {
      const detail = state.objective || state.check || state.mode
      console.log(`    ${sessionId.slice(0, 8)}... - ${detail}`)
    }
  }

  if (!pending && activeSessions.length === 0 && !paused) {
    console.log('  None active')
  }

  // Show registered sessions
  if (registeredSessions.length > 0) {
    console.log()
    console.log(`Known sessions (${registeredSessions.length}):`)
    for (const s of registeredSessions.slice(0, 5)) {
      const age = Date.now() - new Date(s.lastSeen).getTime()
      const ageStr = age < 60000 ? 'just now' :
                     age < 3600000 ? `${Math.floor(age / 60000)}m ago` :
                     `${Math.floor(age / 3600000)}h ago`
      console.log(`  ${s.sessionId.slice(0, 8)}... - ${s.displayName} (${ageStr})`)
    }
    if (registeredSessions.length > 5) {
      console.log(`  ... and ${registeredSessions.length - 5} more`)
    }
  }

  console.log()
}

function handleHistory(): void {
  const subcommand = args[0]

  if (subcommand === 'stats') {
    // Show stats
    const count = history.getCount()
    const stats = history.getProjectStats()
    console.log('=== History Stats ===\n')
    console.log(`Total events: ${count}`)
    console.log('\nBy project:')
    for (const { project: proj, count: c } of stats) {
      console.log(`  ${proj}: ${c}`)
    }
    return
  }

  if (subcommand === 'search' && args[1]) {
    const query = args.slice(1).join(' ')
    const events = history.search(query, 20)
    console.log(`=== Search: "${query}" ===\n`)
    printEvents(events)
    return
  }

  if (subcommand === 'export') {
    const format = args[1] || 'json'
    if (format === 'csv') {
      console.log(history.exportToCsv())
    } else {
      console.log(history.exportToJson())
    }
    return
  }

  if (subcommand === 'prune') {
    const days = args[1] ? parseInt(args[1], 10) : 30
    const deleted = history.deleteOlderThan(days)
    history.vacuum()
    console.log(`Deleted ${deleted} events older than ${days} days.`)
    return
  }

  // Default: show recent events
  const limit = subcommand ? parseInt(subcommand, 10) || 20 : 20
  const events = history.getRecent(limit)
  console.log(`=== Recent Events (${events.length}) ===\n`)
  printEvents(events)
}

function printEvents(events: ReturnType<typeof history.getRecent>): void {
  for (const event of events) {
    const date = new Date(event.timestamp)
    const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    const sessionShort = event.session_id?.slice(0, 8) || '--------'

    // Compact single-line format with full message
    const prefix = `${time} ${event.type.padEnd(14)} ${event.project.padEnd(12)} ${sessionShort}`
    const msg = event.message || ''
    console.log(`${prefix}  ${msg}`)

    if (event.payload && args.includes('--full')) {
      console.log(`${''.padEnd(50)}  ${JSON.stringify(event.payload)}`)
    }
  }
}

// Main router
async function main(): Promise<void> {
  switch (command) {
    case 'speak':
    case 'sp':
      handleSpeak()
      break

    case 'until':
    case 'u':
      await handleUntil()
      break

    case 'status':
    case 's':
    case undefined:
      handleStatus()
      break

    case 'off':
      // Shortcut for until off
      continuation.clearPending()
      continuation.clearAllSessions()
      continuation.clearPause()
      console.log('All until loops cleared.')
      await speak(renderTemplate('missionComplete', {}))
      break

    case 'pause':
      // Shortcut for until pause
      continuation.setPause()
      console.log('Pause requested.')
      break

    case 'history':
    case 'h':
      handleHistory()
      break

    case 'help':
    case '--help':
    case '-h':
      showHelp()
      break

    default:
      console.error(`Unknown command: ${command}`)
      console.error('Run "hooked help" for usage.')
      process.exit(1)
  }
}

main().catch(console.error)
