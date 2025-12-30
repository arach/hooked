#!/usr/bin/env node
/**
 * hooked CLI - Runtime commands
 *
 * Usage:
 *   hooked continue <preset|off>  - Set continuation mode
 *   hooked status                 - Show current state
 *   hooked init                   - Run setup wizard
 */

import { config } from '../core/config'
import { state } from '../core/state'
import { presets, type Preset } from '../core/presets'

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
}

function c(color: keyof typeof COLORS, text: string): string {
  return `${COLORS[color]}${text}${COLORS.reset}`
}

function printStatus(): void {
  const cfg = config.get()
  const globalPreset = cfg.activePreset
  const pending = state.getPending()

  console.log('')
  console.log(c('bold', '  hooked status'))
  console.log('')

  // Show pending activation
  if (pending) {
    const preset = presets.get(pending.preset)
    console.log(`  Pending: ${c('yellow', pending.preset)} ${c('dim', '(waiting for session)')}`)
    if (pending.objective) {
      console.log(`  ${c('dim', `Objective: ${pending.objective}`)}`)
    }
    if (preset?.check) {
      console.log(`  ${c('dim', `Check: ${preset.check}`)}`)
    }
    console.log('')
  }

  // Show global continuation
  if (globalPreset) {
    const preset = presets.get(globalPreset)
    console.log(`  Global: ${c('green', 'ON')} (${c('cyan', globalPreset)})`)
    if (preset?.description) {
      console.log(`  ${c('dim', preset.description)}`)
    }
    if (preset?.check) {
      console.log(`  ${c('dim', `Check: ${preset.check}`)}`)
    }
  } else if (!pending) {
    console.log(`  Continuation: ${c('dim', 'OFF')}`)
  }

  console.log('')
  console.log(`  Flags:`)
  console.log(`    speak:   ${cfg.flags.speak ? c('green', 'on') : c('dim', 'off')}`)
  console.log(`    logging: ${cfg.flags.logging ? c('green', 'on') : c('dim', 'off')}`)
  console.log('')
}

function printPresets(): void {
  console.log('')
  console.log(c('bold', '  Available presets:'))
  console.log('')

  for (const preset of presets.list()) {
    const check = preset.check ? c('dim', ` (${preset.check})`) : c('dim', ' (manual)')
    console.log(`    ${c('cyan', preset.name.padEnd(12))} ${preset.description}${check}`)
  }

  console.log('')
}

function setContinuation(presetName: string): void {
  // Handle "off" to disable
  if (presetName === 'off') {
    config.setActivePreset(null)
    console.log('')
    console.log(`  ${c('green', '✓')} Continuation ${c('dim', 'OFF')}`)
    console.log(`  ${c('dim', 'Claude will stop normally')}`)
    console.log('')
    return
  }

  // Check if preset exists
  const preset = presets.get(presetName)
  if (!preset) {
    console.log('')
    console.log(`  ${c('red', '✗')} Unknown preset: ${c('yellow', presetName)}`)
    printPresets()
    process.exit(1)
  }

  // Set the preset
  config.setActivePreset(presetName)
  console.log('')
  console.log(`  ${c('green', '✓')} Continuation ${c('green', 'ON')} (${c('cyan', presetName)})`)
  console.log(`  ${c('dim', preset.description)}`)
  if (preset.check) {
    console.log(`  ${c('dim', `Will keep working until: ${preset.check}`)}`)
  }
  console.log('')
}

/**
 * Bind a preset to the current session (session-scoped continuation).
 * Creates a pending activation that will be claimed by the next hook.
 */
function bindToSession(presetName: string, objective?: string): void {
  // Handle "off" to clear pending
  if (presetName === 'off') {
    state.clearPending()
    console.log('')
    console.log(`  ${c('green', '✓')} Session continuation ${c('dim', 'OFF')}`)
    console.log(`  ${c('dim', 'Pending activation cleared')}`)
    console.log('')
    return
  }

  // Check if preset exists
  const preset = presets.get(presetName)
  if (!preset) {
    console.log('')
    console.log(`  ${c('red', '✗')} Unknown preset: ${c('yellow', presetName)}`)
    printPresets()
    process.exit(1)
  }

  // Set pending activation
  state.setPending(presetName, objective)
  console.log('')
  console.log(`  ${c('green', '✓')} Pending activation: ${c('cyan', presetName)}`)
  console.log(`  ${c('dim', 'Will bind to next Claude session that triggers a hook')}`)
  if (objective) {
    console.log(`  ${c('dim', `Objective: ${objective}`)}`)
  }
  if (preset.check) {
    console.log(`  ${c('dim', `Check: ${preset.check}`)}`)
  }
  console.log('')
}

function printHelp(): void {
  console.log('')
  console.log(c('bold', '  hooked') + c('dim', ' - Claude Code hook toolkit'))
  console.log('')
  console.log('  Usage:')
  console.log(`    ${c('cyan', 'hooked bind <preset>')}      Session-scoped continuation (recommended)`)
  console.log(`    ${c('cyan', 'hooked bind off')}           Clear pending activation`)
  console.log(`    ${c('cyan', 'hooked continue <preset>')}  Global continuation mode`)
  console.log(`    ${c('cyan', 'hooked status')}             Show current state`)
  console.log(`    ${c('cyan', 'hooked presets')}            List available presets`)
  console.log(`    ${c('cyan', 'hooked init')}               Run setup wizard`)
  console.log('')
  console.log('  Session-scoped (bind):')
  console.log(`    ${c('dim', 'hooked bind test')}          Bind to THIS Claude session only`)
  console.log(`    ${c('dim', 'hooked bind manual "objective"')}  With custom objective`)
  console.log('')
  console.log('  Global (continue):')
  console.log(`    ${c('dim', 'hooked continue test')}      Applies to ALL sessions`)
  console.log(`    ${c('dim', 'hooked continue off')}       Disable global continuation`)
  console.log('')
}

export function runCommand(args: string[]): void {
  const command = args[0]

  switch (command) {
    case 'bind':
    case 'b':
      if (!args[1]) {
        console.log('')
        console.log(`  ${c('red', '✗')} Missing preset name`)
        console.log(`  ${c('dim', 'Usage: hooked bind <preset|off> [objective]')}`)
        printPresets()
        process.exit(1)
      }
      bindToSession(args[1], args[2])
      break

    case 'continue':
    case 'c':
      if (!args[1]) {
        console.log('')
        console.log(`  ${c('red', '✗')} Missing preset name`)
        console.log(`  ${c('dim', 'Usage: hooked continue <preset|off>')}`)
        printPresets()
        process.exit(1)
      }
      setContinuation(args[1])
      break

    case 'status':
    case 's':
      printStatus()
      break

    case 'presets':
    case 'p':
      printPresets()
      break

    case 'help':
    case '-h':
    case '--help':
      printHelp()
      break

    case 'init':
      // Will be handled by the main CLI
      break

    default:
      if (command) {
        // Handle `hooked off` as shorthand for `hooked bind off`
        if (command === 'off') {
          bindToSession('off')
          return
        }
        // Maybe they're trying to use a shorthand like `hooked test`
        // Default to bind (session-scoped) behavior
        const preset = presets.get(command)
        if (preset) {
          bindToSession(command, args[1])
          return
        }
        console.log('')
        console.log(`  ${c('red', '✗')} Unknown command: ${c('yellow', command)}`)
      }
      printHelp()
      if (command) process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCommand(process.argv.slice(2))
}
