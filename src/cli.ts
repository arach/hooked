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
import { config } from './core/config'
import { speak } from './core/speak'

const [, , command, ...args] = process.argv

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
      await speak('Mission complete.')
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
      const state = continuation.setPending('check', checkCmd)
      console.log('Until loop pending.')
      console.log(`Mode: check`)
      console.log(`Command: ${state.check}`)
      console.log('\nNext Claude stop will claim this loop.')
      break
    }

    default: {
      // Treat as objective
      const objective = [subcommand, ...args.slice(1)].join(' ')
      const state = continuation.setPending('manual', objective)
      console.log('Until loop pending.')
      console.log(`Mode: manual`)
      console.log(`Objective: ${state.objective}`)
      console.log('\nNext Claude stop will claim this loop.')
    }
  }
}

function handleStatus(): void {
  const cfg = config.get()
  const pending = continuation.getPending()
  const sessions = continuation.getActiveSessions()
  const paused = continuation.isPaused()

  console.log('=== Hooked Status ===\n')

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
  }

  if (sessions.length > 0) {
    console.log(`  Active (${sessions.length}):`)
    for (const { sessionId, state } of sessions) {
      const detail = state.objective || state.check || state.mode
      console.log(`    ${sessionId.slice(0, 8)}... - ${detail}`)
    }
  }

  if (!pending && sessions.length === 0 && !paused) {
    console.log('  None active')
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
      await speak('Mission complete.')
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
