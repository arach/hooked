#!/usr/bin/env node

import { intro, outro, select, confirm, note, spinner, isCancel, cancel } from '@clack/prompts'
import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'
import { homedir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { runCommand } from './commands'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..', '..')

// Our home - everything lives here
const HOOKED_HOME = join(homedir(), '.hooked')
const HOOKED_SRC = join(HOOKED_HOME, 'src')
const HOOKED_STATE = join(HOOKED_HOME, 'state')
const HOOKED_HISTORY = join(HOOKED_HOME, 'history')
const CONFIG_FILE = join(HOOKED_HOME, 'config.json')

// Claude's hooks - minimal stubs only
const CLAUDE_DIR = join(homedir(), '.claude')
const HOOKS_DIR = join(CLAUDE_DIR, 'hooks')
const SETTINGS_FILE = join(CLAUDE_DIR, 'settings.json')

// Saved preferences interface
interface InitPreferences {
  features: 'all' | 'notifications' | 'continuation' | 'custom'
  hasSpeakeasy: boolean
  commandGlobal: boolean
  setupNotifications: boolean
  setupContinuation: boolean
}

function loadPreferences(): InitPreferences | null {
  try {
    if (existsSync(CONFIG_FILE)) {
      const config = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'))
      if (config.initPreferences) {
        return config.initPreferences as InitPreferences
      }
    }
  } catch {
    // Ignore parse errors
  }
  return null
}

function savePreferences(prefs: InitPreferences): void {
  let config: Record<string, unknown> = {}
  try {
    if (existsSync(CONFIG_FILE)) {
      config = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'))
    }
  } catch {
    // Start fresh
  }
  config.initPreferences = prefs
  mkdirSync(HOOKED_HOME, { recursive: true })
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}

// Check if this is a runtime command (not init)
const args = process.argv.slice(2)
const RUNTIME_COMMANDS = ['continue', 'c', 'status', 's', 'presets', 'p', 'help', '-h', '--help']
const firstArg = args[0]
const forceReconfigure = args.includes('--reconfigure') || args.includes('-r')

// Handle runtime commands or shorthand preset names
if (firstArg && (RUNTIME_COMMANDS.includes(firstArg) || !['init', '--reconfigure', '-r'].includes(firstArg))) {
  // Check if it might be a preset name shorthand
  if (firstArg && !RUNTIME_COMMANDS.includes(firstArg) && firstArg !== 'init') {
    // Could be `hooked test` as shorthand for `hooked continue test`
    runCommand([firstArg])
  } else {
    runCommand(args)
  }
  process.exit(0)
}

async function main() {
  // Check for saved preferences (skip interactive if already configured)
  const savedPrefs = loadPreferences()
  const isUpdate = savedPrefs && !forceReconfigure

  if (isUpdate) {
    // Quick update mode - use saved preferences
    console.log('🎣 Updating hooked...')
    await runInstall(savedPrefs)
    return
  }

  // First time or --reconfigure: run interactive setup
  intro('🎣 Welcome to hooked')

  note(
    `hooked is a TypeScript toolkit for Claude Code hooks.

It helps you:
• Get voice notifications when Claude needs you
• Keep Claude working until a task is done
• Control continuation with simple commands`,
    'What is hooked?'
  )

  // Ask what they want to set up
  const features = await select({
    message: 'What would you like to set up?',
    options: [
      { value: 'all', label: 'Everything (recommended)', hint: 'notifications + continuation + skills' },
      { value: 'notifications', label: 'Notifications only', hint: 'voice alerts when Claude needs you' },
      { value: 'continuation', label: 'Continuation only', hint: 'keep Claude working until done' },
      { value: 'custom', label: 'Let me choose', hint: 'pick individual features' },
    ],
  })

  if (isCancel(features)) {
    cancel('Setup cancelled')
    process.exit(0)
  }

  let setupNotifications = features === 'all' || features === 'notifications'
  let setupContinuation = features === 'all' || features === 'continuation'
  let hasSpeakeasy = false

  if (features === 'custom') {
    setupNotifications = await confirm({
      message: 'Set up voice notifications?',
      initialValue: true,
    }) as boolean

    if (isCancel(setupNotifications)) {
      cancel('Setup cancelled')
      process.exit(0)
    }

    setupContinuation = await confirm({
      message: 'Set up continuation hooks?',
      initialValue: true,
    }) as boolean

    if (isCancel(setupContinuation)) {
      cancel('Setup cancelled')
      process.exit(0)
    }
  }

  // Notifications setup
  if (setupNotifications) {
    note(
      `Voice notifications use SpeakEasy for text-to-speech.

If you haven't set it up yet:
  npm install -g @arach/speakeasy
  speakeasy config

SpeakEasy supports ElevenLabs and other TTS providers.
Learn more: https://github.com/arach/speakeasy`,
      '🔊 Notifications'
    )

    const speakeasyAnswer = await confirm({
      message: 'Do you have SpeakEasy configured?',
      active: 'Yes',
      inactive: 'No',
    })

    if (isCancel(speakeasyAnswer)) {
      cancel('Setup cancelled')
      process.exit(0)
    }

    hasSpeakeasy = speakeasyAnswer as boolean

    if (!hasSpeakeasy) {
      note(
        `To enable voice notifications later:

  npm install -g @arach/speakeasy
  speakeasy config

Notifications will still work (logged to ~/.hooked/history/).`,
        'No problem!'
      )
    }
  }

  // Build preferences object to pass to install and save
  const prefs: InitPreferences = {
    features: features as InitPreferences['features'],
    hasSpeakeasy,
    commandGlobal: false, // Will be set during install
    setupNotifications,
    setupContinuation,
  }

  await runInstall(prefs, true)
}

async function runInstall(prefs: InitPreferences, isFirstRun = false) {
  let { setupNotifications, setupContinuation } = prefs
  let setupCommandGlobal = prefs.commandGlobal

  // Install hooked
  const s = spinner()
  s.start('Copying files...')

  try {
    // Create ~/.hooked/ structure
    mkdirSync(HOOKED_HOME, { recursive: true })
    mkdirSync(HOOKED_STATE, { recursive: true })
    mkdirSync(HOOKED_HISTORY, { recursive: true })
    mkdirSync(HOOKS_DIR, { recursive: true })

    // Copy src/ to ~/.hooked/src/
    const srcDir = join(PROJECT_ROOT, 'src')
    cpSync(srcDir, HOOKED_SRC, { recursive: true })

    // Copy package.json to ~/.hooked/
    const pkgSrc = join(PROJECT_ROOT, 'package.json')
    const pkgDest = join(HOOKED_HOME, 'package.json')
    cpSync(pkgSrc, pkgDest)

    s.stop('Files copied!')

    // Install dependencies
    const depSpinner = spinner()
    depSpinner.start('Installing dependencies...')
    execSync('npm install --production', { cwd: HOOKED_HOME, stdio: 'pipe' })
    depSpinner.stop('Dependencies installed!')

    // Create minimal stub hooks in ~/.claude/hooks/
    const stubSpinner = spinner()
    stubSpinner.start('Configuring hooks...')

    // Read or create settings
    let settings: Record<string, unknown> = {}
    if (existsSync(SETTINGS_FILE)) {
      settings = JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8'))
    }
    if (!settings.hooks) {
      settings.hooks = {}
    }
    const hooks = settings.hooks as Record<string, unknown[]>

    // Use tsx from our own node_modules
    const tsxBin = join(HOOKED_HOME, 'node_modules', '.bin', 'tsx')

    if (setupNotifications) {
      hooks.Notification = [{
        hooks: [{
          type: 'command',
          command: `${tsxBin} ${HOOKED_SRC}/notification.ts`,
        }],
      }]
    }

    if (setupContinuation) {
      hooks.Stop = [{
        hooks: [{
          type: 'command',
          command: `${tsxBin} ${HOOKED_SRC}/stop/default-hook.ts`,
        }],
      }]
    }

    // Write settings
    writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2))

    // Copy command to ~/.hooked/commands/
    const commandSrc = join(PROJECT_ROOT, '.claude', 'commands', 'hooked.md')
    const commandDir = join(HOOKED_HOME, 'commands')
    mkdirSync(commandDir, { recursive: true })
    if (existsSync(commandSrc)) {
      cpSync(commandSrc, join(commandDir, 'hooked.md'))
    }

    stubSpinner.stop('Hooks configured!')

    // Only ask about global command on first run
    if (isFirstRun && setupContinuation) {
      const installCommand = await select({
        message: 'Install /hooked command globally?',
        options: [
          { value: 'global', label: 'Yes, globally', hint: '~/.claude/commands/ - works in all projects' },
          { value: 'skip', label: 'No, I\'ll copy per-project', hint: 'cp ~/.hooked/commands/hooked.md .claude/commands/' },
        ],
      })

      if (!isCancel(installCommand) && installCommand === 'global') {
        setupCommandGlobal = true
      }
    }

    // Install global command if needed
    if (setupCommandGlobal) {
      const globalCommandDir = join(CLAUDE_DIR, 'commands')
      mkdirSync(globalCommandDir, { recursive: true })
      cpSync(join(commandDir, 'hooked.md'), join(globalCommandDir, 'hooked.md'))
    }

    // Save preferences for future updates
    prefs.commandGlobal = setupCommandGlobal
    savePreferences(prefs)

  } catch (error) {
    s.stop('Installation failed')
    console.error(error)
    process.exit(1)
  }

  // Output summary
  if (isFirstRun) {
    // Detailed summary for first run
    console.log('')
    console.log('─────────────────────────────────────────────────────────')
    console.log('')
    console.log('  🎣 hooked is installed!')
    console.log('')
    console.log('  📁 ~/.hooked/')
    console.log('     ├── src/       Edit to customize behavior')
    console.log('     ├── state/     Runtime state')
    console.log('     ├── history/   Event logs')
    console.log('     └── commands/  Slash command definitions')
    console.log('')
    console.log('  🪝 ~/.claude/hooks/')
    if (setupNotifications) {
      console.log('     ├── hooked-notification.ts')
    }
    if (setupContinuation) {
      console.log('     └── hooked-stop.ts')
    }
    console.log('')
    if (setupContinuation) {
      console.log('  🎮 Quick start:')
      console.log('     /hooked continuation "your objective"')
      console.log('     /hooked continuation --check "pnpm build"')
      console.log('     /hooked continuation OFF')
      console.log('')
    }
    if (setupCommandGlobal) {
      console.log('  📦 /hooked command installed globally')
      console.log('     Works in all projects!')
    } else {
      console.log('  📦 Add /hooked command to a project:')
      console.log('     cp ~/.hooked/commands/hooked.md .claude/commands/')
    }
    console.log('')
    console.log('  💡 Re-run to update. Use --reconfigure to change settings.')
    console.log('')
    console.log('─────────────────────────────────────────────────────────')
    console.log('')
    outro('Learn more: https://github.com/arach/hooked')
  } else {
    // Brief summary for updates
    console.log('')
    console.log('✓ Files copied to ~/.hooked/src/')
    console.log('✓ Hooks configured in ~/.claude/settings.json')
    if (setupCommandGlobal) {
      console.log('✓ /hooked command updated')
    }
    console.log('')
    console.log('💡 Run with --reconfigure to change settings')
    console.log('')
  }
}

main().catch(console.error)
