#!/usr/bin/env node
/**
 * hooked init - Installs hooked to ~/.hooked and configures Claude Code hooks
 *
 * Two modes:
 *   --onboard    Interactive first-time setup with explanations
 *   (default)    Quick, non-interactive install/update
 *
 * Flags:
 *   --no-backup  Skip Claude settings backups
 */

import { existsSync, mkdirSync, cpSync, readFileSync, readdirSync, chmodSync, statSync, rmSync } from 'fs'
import { execSync } from 'child_process'
import { homedir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { writeFileAtomic } from './core/fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..')

// Destinations
const HOOKED_HOME = join(homedir(), '.hooked')
const HOOKED_SRC = join(HOOKED_HOME, 'src')
const HOOKED_BIN = join(HOOKED_HOME, 'bin')
const HOOKED_BACKUPS = join(HOOKED_HOME, 'backups')
const BACKUP_RETENTION_LIMIT = 10
const CLAUDE_DIR = join(homedir(), '.claude')
const SETTINGS_FILE = join(CLAUDE_DIR, 'settings.json')
const SETTINGS_LOCAL_FILE = join(CLAUDE_DIR, 'settings.local.json')
const COMMANDS_DIR = join(CLAUDE_DIR, 'commands')

const args = process.argv.slice(2)
const isOnboarding = args.includes('--onboard') || args.includes('-o')
const isNoBackup = args.includes('--no-backup')

type BackupResult = {
  created: boolean
  pruned: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function entryHasCommand(entry: unknown, command: string): boolean {
  if (!isRecord(entry)) return false
  if (entry.command === command) return true
  const hooks = entry.hooks
  if (Array.isArray(hooks)) {
    return hooks.some(hook => isRecord(hook) && hook.command === command)
  }
  return false
}

function ensureHookCommand(hooks: Record<string, unknown>, hookName: string, command: string): boolean {
  const existing = hooks[hookName]

  if (Array.isArray(existing)) {
    if (existing.some(entry => entryHasCommand(entry, command))) {
      return false
    }
    const entryWithHooks = existing.find(entry => isRecord(entry) && Array.isArray(entry.hooks))
    if (entryWithHooks && isRecord(entryWithHooks) && Array.isArray(entryWithHooks.hooks)) {
      entryWithHooks.hooks.push({ type: 'command', command })
    } else {
      existing.push({ hooks: [{ type: 'command', command }] })
    }
    return true
  }

  if (isRecord(existing)) {
    if (entryHasCommand(existing, command)) {
      return false
    }
    if (Array.isArray(existing.hooks)) {
      existing.hooks.push({ type: 'command', command })
      return true
    }
    hooks[hookName] = [existing, { hooks: [{ type: 'command', command }] }]
    return true
  }

  hooks[hookName] = [{ hooks: [{ type: 'command', command }] }]
  return true
}

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

function backupFile(src: string, dest: string): void {
  if (!existsSync(src)) return
  const destDir = dirname(dest)
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true })
  }
  cpSync(src, dest)
}

function getBackupFolderName(): string {
  const dateStamp = new Date().toISOString().slice(0, 10)
  const baseName = `${dateStamp}-hooked-backup`
  let name = baseName
  let counter = 1

  while (existsSync(join(HOOKED_BACKUPS, name))) {
    name = `${baseName}-${counter}`
    counter += 1
  }

  return name
}

function isHookedBackupDir(name: string): boolean {
  return /^\d{4}-\d{2}-\d{2}-hooked-backup(?:-\d+)?$/.test(name)
}

function pruneOldBackups(limit: number): number {
  if (!existsSync(HOOKED_BACKUPS)) return 0

  const entries = readdirSync(HOOKED_BACKUPS, { withFileTypes: true })
  const backups = entries
    .filter(entry => entry.isDirectory() && isHookedBackupDir(entry.name))
    .map(entry => {
      const fullPath = join(HOOKED_BACKUPS, entry.name)
      let mtimeMs = 0
      try {
        mtimeMs = statSync(fullPath).mtimeMs
      } catch {
        mtimeMs = 0
      }
      return { name: entry.name, path: fullPath, mtimeMs }
    })

  if (backups.length <= limit) return 0

  backups.sort((a, b) => b.mtimeMs - a.mtimeMs)
  const toRemove = backups.slice(limit)
  let removed = 0

  for (const backup of toRemove) {
    try {
      rmSync(backup.path, { recursive: true, force: true })
      removed += 1
    } catch {
      // Ignore pruning errors to avoid failing install
    }
  }

  return removed
}

function backupExistingInstall(retentionLimit: number): BackupResult {
  const hasClaudeSettings = existsSync(SETTINGS_FILE) || existsSync(SETTINGS_LOCAL_FILE)

  if (!hasClaudeSettings) {
    return { created: false, pruned: 0 }
  }

  mkdirSync(HOOKED_BACKUPS, { recursive: true })
  const backupRoot = join(HOOKED_BACKUPS, getBackupFolderName())
  const claudeBackup = join(backupRoot, 'claude')

  backupFile(SETTINGS_FILE, join(claudeBackup, 'settings.json'))
  backupFile(SETTINGS_LOCAL_FILE, join(claudeBackup, 'settings.local.json'))

  log(`Backed up Claude settings to ${backupRoot}`)
  const pruned = pruneOldBackups(retentionLimit)

  return { created: true, pruned }
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

  // 5. Copy bin/ → ~/.hooked/bin/ and make executable
  const binDir = join(PROJECT_ROOT, 'bin')
  if (existsSync(binDir)) {
    copyDirRecursive(binDir, HOOKED_BIN)
    chmodSync(join(HOOKED_BIN, 'hooked'), 0o755)
    log('Installed hooked CLI to ~/.hooked/bin/')
  }

  // 6. Add permission to ~/.claude/settings.local.json
  let localSettings: Record<string, unknown> = {}
  let localSettingsChanged = false
  let permissionAdded = false
  if (existsSync(SETTINGS_LOCAL_FILE)) {
    try {
      localSettings = JSON.parse(readFileSync(SETTINGS_LOCAL_FILE, 'utf-8'))
    } catch {
      // Start fresh if parse fails
      localSettingsChanged = true
    }
  } else {
    localSettingsChanged = true
  }

  if (!isRecord(localSettings.permissions)) {
    localSettings.permissions = { allow: [], deny: [] }
    localSettingsChanged = true
  }
  const permissions = localSettings.permissions as { allow: string[]; deny: string[] }
  if (!permissions.allow) {
    permissions.allow = []
    localSettingsChanged = true
  }

  const hookedPermission = 'Bash(~/.hooked/bin/hooked:*)'
  if (!permissions.allow.includes(hookedPermission)) {
    permissions.allow.push(hookedPermission)
    localSettingsChanged = true
    permissionAdded = true
  }

  // 7. Configure hooks in ~/.claude/settings.json
  let settings: Record<string, unknown> = {}
  let settingsChanged = false
  if (existsSync(SETTINGS_FILE)) {
    try {
      settings = JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8'))
    } catch {
      // Start fresh if parse fails
      settingsChanged = true
    }
  } else {
    settingsChanged = true
  }

  if (!isRecord(settings.hooks)) {
    settings.hooks = {}
    settingsChanged = true
  }
  const hooks = settings.hooks as Record<string, unknown>

  const tsxBin = join(HOOKED_HOME, 'node_modules', '.bin', 'tsx')
  let hooksAdded = 0

  // Configure hooks (merge instead of overwrite)
  if (ensureHookCommand(hooks, 'Notification', `${tsxBin} ${HOOKED_SRC}/notification.ts`)) {
    settingsChanged = true
    hooksAdded += 1
  }
  if (ensureHookCommand(hooks, 'Stop', `${tsxBin} ${HOOKED_SRC}/stop-hook.ts`)) {
    settingsChanged = true
    hooksAdded += 1
  }
  if (ensureHookCommand(hooks, 'UserPromptSubmit', `${tsxBin} ${HOOKED_SRC}/user-prompt-submit.ts`)) {
    settingsChanged = true
    hooksAdded += 1
  }

  let backupStatus = 'none'
  let backupsPruned = 0
  if (localSettingsChanged || settingsChanged) {
    if (isNoBackup) {
      backupStatus = 'skipped (--no-backup)'
    } else {
      const backupResult = backupExistingInstall(BACKUP_RETENTION_LIMIT)
      backupsPruned = backupResult.pruned
      backupStatus = backupResult.created ? 'created' : 'not needed'
    }
  } else {
    backupStatus = 'none (no changes)'
  }

  if (localSettingsChanged) {
    writeFileAtomic(SETTINGS_LOCAL_FILE, JSON.stringify(localSettings, null, 2))
    log(permissionAdded ? 'Added hooked to allowed commands' : 'Updated ~/.claude/settings.local.json')
  }

  if (settingsChanged) {
    writeFileAtomic(SETTINGS_FILE, JSON.stringify(settings, null, 2))
    log('Configured hooks in ~/.claude/settings.json')
  }

  // 8. Copy slash command to ~/.claude/commands/
  const commandSrc = join(PROJECT_ROOT, '.claude', 'commands', 'hooked.md')
  let commandStatus = 'missing source'
  if (existsSync(commandSrc)) {
    const commandDest = join(COMMANDS_DIR, 'hooked.md')
    const srcContents = readFileSync(commandSrc, 'utf-8')
    let shouldCopy = true
    commandStatus = 'installed'

    if (existsSync(commandDest)) {
      const destContents = readFileSync(commandDest, 'utf-8')
      if (destContents === srcContents) {
        shouldCopy = false
        commandStatus = 'unchanged'
      } else {
        if (!isNoBackup) {
          const backupPath = `${commandDest}.backup-${Date.now()}`
          cpSync(commandDest, backupPath)
          log(`Backed up existing /hooked command to ${backupPath}`)
          commandStatus = 'updated'
        } else {
          commandStatus = 'overwritten (no backup)'
        }
      }
    }

    if (shouldCopy) {
      cpSync(commandSrc, commandDest)
      log(commandStatus === 'installed' ? 'Installed /hooked command globally' : 'Updated /hooked command globally')
    }
  }

  // 9. Ensure config exists with defaults
  const configFile = join(HOOKED_HOME, 'config.json')
  let configCreated = false
  if (!existsSync(configFile)) {
    writeFileAtomic(configFile, JSON.stringify({
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
    configCreated = true
  }

  // 10. Clean up stale session registry entries (older than 24h)
  try {
    const { log: hookedLog } = await import('./core/log')
    hookedLog.clearStaleSessions()
    log('Cleaned up stale sessions')
  } catch {
    // Ignore if log module not available yet
  }

  const summaryLines: string[] = []
  summaryLines.push(`Hooks added: ${hooksAdded}`)
  summaryLines.push(
    `Claude settings updated: settings.json ${settingsChanged ? 'yes' : 'no'}, settings.local.json ${localSettingsChanged ? 'yes' : 'no'}`
  )
  summaryLines.push(`/hooked command: ${commandStatus}`)
  summaryLines.push(`Backup: ${backupStatus}`)
  if (!isNoBackup) {
    summaryLines.push(`Backup retention: keep last ${BACKUP_RETENTION_LIMIT}`)
  }
  if (backupsPruned > 0) {
    summaryLines.push(`Backups pruned: ${backupsPruned}`)
  }
  summaryLines.push(`Config created: ${configCreated ? 'yes' : 'no'}`)

  console.log('')
  log('Summary')
  for (const line of summaryLines) {
    log(`- ${line}`)
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
