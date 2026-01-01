#!/usr/bin/env node
/**
 * hooked init - Installs hooked to ~/.hooked and configures Claude Code hooks
 *
 * Two modes:
 *   --onboard    Interactive first-time setup with explanations
 *   (default)    Quick, non-interactive install/update
 */

import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync, readdirSync } from 'fs'
import { execSync } from 'child_process'
import { homedir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..')

// Destinations
const HOOKED_HOME = join(homedir(), '.hooked')
const HOOKED_SRC = join(HOOKED_HOME, 'src')
const CLAUDE_DIR = join(homedir(), '.claude')
const SETTINGS_FILE = join(CLAUDE_DIR, 'settings.json')
const COMMANDS_DIR = join(CLAUDE_DIR, 'commands')

const args = process.argv.slice(2)
const isOnboarding = args.includes('--onboard') || args.includes('-o')

function log(msg: string): void {
  console.log(`  ${msg}`)
}

function copyDirRecursive(src: string, dest: string): void {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true })
  }

  const entries = readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath)
    } else {
      cpSync(srcPath, destPath)
    }
  }
}

async function runOnboarding(): Promise<void> {
  const { intro, outro, note, confirm, isCancel, cancel } = await import('@clack/prompts')

  intro('Welcome to hooked')

  note(
    `hooked adds two powerful features to Claude Code:

1. Voice Notifications
   Get spoken alerts when Claude completes tasks
   (requires SpeakEasy: npm install -g @arach/speakeasy)

2. Session Continuations
   Keep Claude working toward an objective
   Uses lazy binding - set once, claim per-session`,
    'What is hooked?'
  )

  const proceed = await confirm({
    message: 'Ready to install?',
    active: 'Yes',
    inactive: 'No',
  })

  if (isCancel(proceed) || !proceed) {
    cancel('Setup cancelled')
    process.exit(0)
  }

  await runInstall()

  note(
    `Notifications:
  Claude will speak when tasks complete
  Configure voice: speakeasy config

Continuations:
  /hooked "objective"      Keep working toward goal
  /hooked check "command"  Keep working until command passes
  /hooked off              Stop continuation
  /hooked pause            Stop after next cycle
  /hooked status           Show state`,
    'Usage'
  )

  outro('hooked is ready. Happy coding!')
}

async function runInstall(): Promise<void> {
  console.log('')
  console.log('  Installing hooked...')
  console.log('')

  // 1. Create directories
  mkdirSync(HOOKED_HOME, { recursive: true })
  mkdirSync(join(HOOKED_HOME, 'state'), { recursive: true })
  mkdirSync(join(HOOKED_HOME, 'history'), { recursive: true })
  mkdirSync(COMMANDS_DIR, { recursive: true })
  log('Created directories')

  // 2. Copy src/ → ~/.hooked/src/
  const srcDir = join(PROJECT_ROOT, 'src')
  copyDirRecursive(srcDir, HOOKED_SRC)
  log('Copied source files')

  // 3. Copy package.json
  cpSync(join(PROJECT_ROOT, 'package.json'), join(HOOKED_HOME, 'package.json'))
  log('Copied package.json')

  // 4. Install dependencies (using npm for broader compatibility)
  log('Installing dependencies...')
  try {
    execSync('npm install --production --silent', { cwd: HOOKED_HOME, stdio: 'pipe' })
    log('Dependencies installed')
  } catch (error) {
    console.error('  Failed to install dependencies:', error)
    process.exit(1)
  }

  // 5. Configure hooks in ~/.claude/settings.json
  let settings: Record<string, unknown> = {}
  if (existsSync(SETTINGS_FILE)) {
    try {
      settings = JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8'))
    } catch {
      // Start fresh if parse fails
    }
  }

  if (!settings.hooks) {
    settings.hooks = {}
  }
  const hooks = settings.hooks as Record<string, unknown[]>

  const tsxBin = join(HOOKED_HOME, 'node_modules', '.bin', 'tsx')

  // Configure notification hook
  hooks.Notification = [{
    hooks: [{
      type: 'command',
      command: `${tsxBin} ${HOOKED_SRC}/notification.ts`,
    }],
  }]

  // Configure stop hook
  hooks.Stop = [{
    hooks: [{
      type: 'command',
      command: `${tsxBin} ${HOOKED_SRC}/stop-hook.ts`,
    }],
  }]

  // Configure user prompt submit hook (clears pending alerts)
  hooks.UserPromptSubmit = [{
    hooks: [{
      type: 'command',
      command: `${tsxBin} ${HOOKED_SRC}/user-prompt-submit.ts`,
    }],
  }]

  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2))
  log('Configured hooks in ~/.claude/settings.json')

  // 6. Copy slash command to ~/.claude/commands/
  const commandSrc = join(PROJECT_ROOT, '.claude', 'commands', 'hooked.md')
  if (existsSync(commandSrc)) {
    cpSync(commandSrc, join(COMMANDS_DIR, 'hooked.md'))
    log('Installed /hooked command globally')
  }

  // 7. Ensure config exists with defaults
  const configFile = join(HOOKED_HOME, 'config.json')
  if (!existsSync(configFile)) {
    writeFileSync(configFile, JSON.stringify({
      voice: {
        enabled: true,
        volume: 1.0,
      },
      alerts: {
        enabled: true,
        reminderMinutes: 5,
        maxReminders: 3,
        escalateAfter: 2,
      },
      logging: true,
      templates: {
        loopStarted: 'In {project}, loop started. {goal}',
        checkPassed: 'In {project}, check passed. Loop complete.',
        checkFailed: 'In {project}, check failed. Keep working.',
        pausing: 'In {project}, pausing as requested.',
        manualRound: 'In {project}, round {round}. Objective: {objective}',
        missionComplete: 'Mission complete.',
        alertReminder: 'Still waiting in {project}. {type}, {minutes} minutes.',
        alertEscalation: 'Urgent! {project} needs attention. {type}, {minutes} minutes.',
      }
    }, null, 2))
    log('Created default config')
  }

  // 8. Clean up stale session registry entries (older than 24h)
  try {
    const { log: hookedLog } = await import('./core/log')
    hookedLog.clearStaleSessions()
    log('Cleaned up stale sessions')
  } catch {
    // Ignore if log module not available yet
  }

  console.log('')
  console.log('  Done! hooked is installed.')
  console.log('')
  console.log('  Features:')
  console.log('    - Voice notifications when Claude completes tasks')
  console.log('    - Session continuations to keep Claude working')
  console.log('')
  console.log('  Voice:')
  console.log('    hooked speak on|off        Toggle voice announcements')
  console.log('')
  console.log('  Continuations:')
  console.log('    hooked until "objective"   Keep working toward goal')
  console.log('    hooked until check "cmd"   Continue until command passes')
  console.log('    hooked off                 Stop continuation')
  console.log('    hooked pause               Stop after next cycle')
  console.log('    hooked status              Show state')
  console.log('')
}

async function main(): Promise<void> {
  if (isOnboarding) {
    await runOnboarding()
  } else {
    await runInstall()
  }
}

main().catch(error => {
  console.error('Init failed:', error)
  process.exit(1)
})
