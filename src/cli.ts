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

Speak:
  speak on|off          Toggle voice announcements

Until:
  until "objective"     Keep working toward objective
  until check "cmd"     Keep working until command passes
  until off             Clear all until loops
  until pause           Stop after next cycle

Examples:
  hooked status
  hooked speak off
  hooked until "implement auth system"
  hooked until check "pnpm test"
  hooked off
`)
}

function handleSpeak(): void {
  const value = args[0]?.toLowerCase()

  if (value === 'on' || value === 'true' || value === '1') {
    config.setFlag('speak', true)
    console.log('Speak: ON')
  } else if (value === 'off' || value === 'false' || value === '0') {
    config.setFlag('speak', false)
    console.log('Speak: OFF')
  } else {
    const current = config.getFlag('speak')
    console.log(`Speak: ${current ? 'ON' : 'OFF'}`)
    console.log('\nUsage: hooked speak on|off')
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

  // Speak section
  console.log('Speak:')
  console.log(`  Voice: ${cfg.flags.speak ? 'ON' : 'OFF'}`)
  console.log(`  Logging: ${cfg.flags.logging ? 'ON' : 'OFF'}`)
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
