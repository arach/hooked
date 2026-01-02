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
import { startServer } from './web/server'

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
  clear                 Clear all alerts and kill reminder processes
  web [port] [mins]     Open web dashboard (default: 3456, auto-close: 10m)

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

Integration:
  statusline            Show Claude Code status line setup
  id [prefix]           Expand short session ID to full UUID

Examples:
  hooked status
  hooked web
  hooked history 50
  hooked history export json > backup.json
  hooked speak off
  hooked until check "pnpm test"
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

  // Upcoming reminders section
  if (pendingAlerts.length > 0) {
    console.log('Upcoming reminders:')
    for (const alert of pendingAlerts) {
      const ageMinutes = alerts.getAgeMinutes(alert)
      const reminderInterval = cfg.alerts.reminderMinutes
      const maxReminders = cfg.alerts.maxReminders

      // Calculate time until next reminder
      // Next reminder fires at: (reminders + 1) * reminderInterval minutes after alert created
      const nextReminderAt = (alert.reminders + 1) * reminderInterval
      const minutesUntilNext = nextReminderAt - ageMinutes

      // Look up session to get path
      const session = registeredSessions.find(s => s.sessionId === alert.sessionId)
      const path = session ? project.folderToPath(session.projectFolder) : alert.project

      console.log(`  ${path} (${alert.sessionId.slice(0, 8)})`)

      if (maxReminders > 0 && alert.reminders >= maxReminders) {
        console.log(`    waiting for ${alert.type} — no more reminders`)
      } else if (minutesUntilNext <= 0) {
        console.log(`    waiting for ${alert.type} — reminder soon`)
      } else {
        console.log(`    waiting for ${alert.type} — next in ${minutesUntilNext}m`)
      }
    }
    console.log()
  }

  // Alert settings (condensed)
  if (cfg.alerts.enabled) {
    const urgentStr = cfg.alerts.urgentAfterMinutes > 0 ? `, urgent after ${cfg.alerts.urgentAfterMinutes}m` : ''
    console.log(`Reminders: every ${cfg.alerts.reminderMinutes}m, max ${cfg.alerts.maxReminders}${urgentStr}`)
    console.log()
  }

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
      const decodedPath = project.folderToPath(s.projectFolder)
      console.log(`  ${s.sessionId.slice(0, 8)}... - ${s.displayName}`)
      console.log(`    ${decodedPath} (${ageStr})`)
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
  // Header
  console.log(`${'TIME'.padEnd(8)} ${'TYPE'.padEnd(14)} ${'PROJECT'.padEnd(12)} ${'SESSION'.padEnd(8)}  MESSAGE`)
  console.log('-'.repeat(80))

  for (const event of events) {
    const date = new Date(event.timestamp)
    const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    const sessionShort = event.session_id?.slice(0, 8) || '--------'

    // Compact single-line format with full message
    const prefix = `${time.padEnd(8)} ${event.type.padEnd(14)} ${event.project.padEnd(12)} ${sessionShort}`
    const msg = event.message || ''
    console.log(`${prefix}  ${msg}`)

    if (event.payload && args.includes('--full')) {
      console.log(`${''.padEnd(50)}  ${JSON.stringify(event.payload)}`)
    }
  }
}

async function handleWeb(): Promise<void> {
  const port = args[0] ? parseInt(args[0], 10) : 3456
  const timeout = args[1] ? parseInt(args[1], 10) : 10  // default 10 minutes
  await startServer(port, timeout)
}

function handleId(): void {
  const prefix = args[0]?.toLowerCase()
  const sessions = log.getAllSessions()

  if (!prefix) {
    // No prefix - list all with full IDs
    if (sessions.length === 0) {
      console.log('No known sessions.')
      return
    }
    console.log('Known sessions:')
    for (const s of sessions.slice(0, 10)) {
      const path = project.folderToPath(s.projectFolder)
      const projectName = path.split('/').pop() || 'unknown'
      console.log(`  ${s.sessionId} - ${projectName}`)
    }
    return
  }

  // Find matching session
  const matches = sessions.filter(s => s.sessionId.toLowerCase().startsWith(prefix))

  if (matches.length === 0) {
    console.log(`No session found matching "${prefix}"`)
    return
  }

  if (matches.length === 1) {
    const s = matches[0]
    const path = project.folderToPath(s.projectFolder)
    console.log(s.sessionId)
    console.log(`  Project: ${path}`)
    return
  }

  // Multiple matches
  console.log(`Multiple sessions match "${prefix}":`)
  for (const s of matches) {
    const path = project.folderToPath(s.projectFolder)
    const projectName = path.split('/').pop() || 'unknown'
    console.log(`  ${s.sessionId} - ${projectName}`)
  }
}

function handleStatusline(): void {
  const hookedHome = process.env.HOME + '/.hooked'
  const statuslineCmd = `${hookedHome}/node_modules/.bin/tsx ${hookedHome}/src/statusline.ts`

  console.log(`
=== Hooked Status Line for Claude Code ===

Two modes available:

1. VANILLA MODE (standalone)
   Full statusline with session ID, hooked state, and tokens.

   Add to ~/.claude/settings.json:
   {
     "statusLine": {
       "type": "command",
       "command": "${statuslineCmd}"
     }
   }

   Output: myproject:a1b2c3 │ ⟳check │ 50k/200k

2. WIDGET MODE (for ccstatusline, etc.)
   Just hooked state - designed to embed in other statusline tools.

   In ccstatusline, add a Custom Command widget:
     Command: ${statuslineCmd} --widget
     Timeout: 2000

   Output: ⟳check 🔔3m (or empty if no hooked state)

Symbols:
  ⟳check    Active check loop
  ⟳manual   Active manual loop
  ⏳         Pending loop (not yet claimed)
  ⏸          Paused
  🔔3m       Alert waiting (with age)
  🔇         Voice disabled
`)
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

    case 'clear':
      // Clear all alerts and kill reminder processes
      const { killed } = alerts.clearAll()
      console.log(`Cleared all alerts.${killed.length > 0 ? ` Killed ${killed.length} reminder process(es).` : ''}`)
      break

    case 'history':
    case 'h':
      handleHistory()
      break

    case 'web':
    case 'dashboard':
      await handleWeb()
      break

    case 'statusline':
      handleStatusline()
      break

    case 'id':
      handleId()
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
