#!/usr/bin/env node
/**
 * Hooked CLI
 *
 * hooked enhances Claude Code with:
 *   - Voice announcements when Claude completes tasks
 *   - Session continuations to keep Claude working
 *
 * Commands:
 *   status                      Show current state
 *   announcements on|off        Toggle voice announcements
 *   continuations "objective"   Keep working toward objective
 *   continuations check "cmd"   Keep working until command passes
 *   continuations off           Clear all continuations
 *   continuations pause         Stop after next cycle
 */

import { continuation } from './continuation'
import { config } from './core/config'
import { speak } from './core/speak'

const [, , command, ...args] = process.argv

function showHelp(): void {
  console.log(`
hooked - Voice announcements & continuations for Claude Code

Commands:
  status                      Show current state

Announcements:
  announcements on|off        Toggle voice announcements

Continuations:
  continuations "objective"   Keep working toward objective
  continuations check "cmd"   Keep working until command passes
  continuations off           Clear all continuations
  continuations pause         Stop after next cycle

Examples:
  hooked status
  hooked announcements off
  hooked continuations "implement auth system"
  hooked continuations check "pnpm test"
  hooked continuations off
`)
}

function handleAnnouncements(): void {
  const value = args[0]?.toLowerCase()

  if (value === 'on' || value === 'true' || value === '1') {
    config.setFlag('speak', true)
    console.log('Announcements: ON')
  } else if (value === 'off' || value === 'false' || value === '0') {
    config.setFlag('speak', false)
    console.log('Announcements: OFF')
  } else {
    const current = config.getFlag('speak')
    console.log(`Announcements: ${current ? 'ON' : 'OFF'}`)
    console.log('\nUsage: hooked announcements on|off')
  }
}

async function handleContinuations(): Promise<void> {
  const subcommand = args[0]

  if (!subcommand) {
    // Show continuation status
    const pending = continuation.getPending()
    const sessions = continuation.getActiveSessions()
    const paused = continuation.isPaused()

    console.log('=== Continuations ===\n')

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
      console.log('No active continuations.')
    }
    return
  }

  // Handle subcommands
  switch (subcommand) {
    case 'off':
      continuation.clearPending()
      continuation.clearAllSessions()
      continuation.clearPause()
      console.log('All continuations cleared.')
      await speak('Mission complete. Continuations cleared.')
      break

    case 'pause':
      continuation.setPause()
      console.log('Pause requested.')
      console.log('Active continuation will complete its current cycle then stop.')
      break

    case 'check': {
      const checkCmd = args.slice(1).join(' ')
      if (!checkCmd) {
        console.error('Error: check command required')
        console.error('Usage: hooked continuations check "pnpm test"')
        process.exit(1)
      }
      const state = continuation.setPending('check', checkCmd)
      console.log('Continuation pending.')
      console.log(`Mode: check`)
      console.log(`Command: ${state.check}`)
      console.log('\nNext Claude stop will claim this continuation.')
      break
    }

    default: {
      // Treat as objective
      const objective = [subcommand, ...args.slice(1)].join(' ')
      const state = continuation.setPending('manual', objective)
      console.log('Continuation pending.')
      console.log(`Mode: manual`)
      console.log(`Objective: ${state.objective}`)
      console.log('\nNext Claude stop will claim this continuation.')
    }
  }
}

function handleStatus(): void {
  const cfg = config.get()
  const pending = continuation.getPending()
  const sessions = continuation.getActiveSessions()
  const paused = continuation.isPaused()

  console.log('=== Hooked Status ===\n')

  // Announcements section
  console.log('Announcements:')
  console.log(`  Voice: ${cfg.flags.speak ? 'ON' : 'OFF'}`)
  console.log(`  Logging: ${cfg.flags.logging ? 'ON' : 'OFF'}`)
  console.log()

  // Continuations section
  console.log('Continuations:')

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
    case 'announcements':
    case 'announce':
    case 'a':
      handleAnnouncements()
      break

    case 'continuations':
    case 'continuation':
    case 'continue':
    case 'c':
      await handleContinuations()
      break

    case 'status':
    case 's':
    case undefined:
      handleStatus()
      break

    case 'off':
      // Shortcut for continuations off
      continuation.clearPending()
      continuation.clearAllSessions()
      continuation.clearPause()
      console.log('All continuations cleared.')
      await speak('Mission complete. Continuations cleared.')
      break

    case 'pause':
      // Shortcut for continuations pause
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
