import { homedir } from 'os'
import { existsSync, mkdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { writeFileAtomic } from './fs'

export interface SpeakTemplates {
  loopStarted: string      // vars: {project}, {goal}
  checkPassed: string      // vars: {project}
  checkFailed: string      // vars: {project}
  pausing: string          // vars: {project}
  manualRound: string      // vars: {project}, {round}, {objective}
  missionComplete: string  // no vars
  // Alert templates
  alertReminder: string    // vars: {project}, {type}, {minutes}
  alertEscalation: string  // vars: {project}, {type}, {minutes}
}

export interface AlertConfig {
  enabled: boolean
  reminderMinutes: number     // How often to remind
  maxReminders: number        // Max reminders before giving up (0 = unlimited)
  urgentAfterMinutes: number  // Escalate to "urgent" after N minutes (0 = never)
}

export interface VoiceConfig {
  enabled: boolean
  volume: number  // 0.0 to 1.0
}

export interface HookedConfig {
  voice: VoiceConfig
  alerts: AlertConfig
  logging: boolean
  templates: SpeakTemplates
}

const HOOKED_HOME = join(homedir(), '.hooked')
const CONFIG_FILE = join(HOOKED_HOME, 'config.json')

const DEFAULT_TEMPLATES: SpeakTemplates = {
  loopStarted: 'In {project}, loop started. {goal}',
  checkPassed: 'In {project}, check passed. Loop complete.',
  checkFailed: 'In {project}, check failed. Keep working.',
  pausing: 'In {project}, pausing as requested.',
  manualRound: 'In {project}, round {round}. Objective: {objective}',
  missionComplete: 'Mission complete.',
  alertReminder: 'Hey, {project} is still waiting.',
  alertEscalation: 'Hey, {project} really needs you. {minutes} minutes now.',
}

const DEFAULT_VOICE: VoiceConfig = {
  enabled: true,
  volume: 1.0,
}

const DEFAULT_ALERTS: AlertConfig = {
  enabled: true,
  reminderMinutes: 5,       // Remind every 5 minutes
  maxReminders: 3,          // Then stop nagging
  urgentAfterMinutes: 0,    // Never escalate by default (0 = disabled)
}

const DEFAULT_CONFIG: HookedConfig = {
  voice: DEFAULT_VOICE,
  alerts: DEFAULT_ALERTS,
  logging: true,
  templates: DEFAULT_TEMPLATES,
}

function ensureDir(): void {
  if (!existsSync(HOOKED_HOME)) {
    mkdirSync(HOOKED_HOME, { recursive: true })
  }
}

export function getConfig(): HookedConfig {
  if (!existsSync(CONFIG_FILE)) {
    return DEFAULT_CONFIG
  }

  try {
    const content = readFileSync(CONFIG_FILE, 'utf-8')
    const parsed = JSON.parse(content) as Partial<HookedConfig> & { flags?: { speak?: boolean; logging?: boolean } }

    // Migration: convert old flags.speak to voice.enabled
    const voice = parsed.voice ?? {
      enabled: parsed.flags?.speak ?? DEFAULT_VOICE.enabled,
      volume: DEFAULT_VOICE.volume,
    }

    // Migration: convert old escalateAfter (count) to urgentAfterMinutes (time)
    const parsedAlerts = parsed.alerts as AlertConfig & { escalateAfter?: number } | undefined
    const urgentAfterMinutes = parsedAlerts?.urgentAfterMinutes ??
      (parsedAlerts?.escalateAfter
        ? parsedAlerts.escalateAfter * (parsedAlerts.reminderMinutes ?? DEFAULT_ALERTS.reminderMinutes)
        : DEFAULT_ALERTS.urgentAfterMinutes)

    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      voice: {
        ...DEFAULT_VOICE,
        ...voice,
      },
      alerts: {
        ...DEFAULT_ALERTS,
        ...parsedAlerts,
        urgentAfterMinutes,
      },
      logging: parsed.logging ?? parsed.flags?.logging ?? DEFAULT_CONFIG.logging,
      templates: {
        ...DEFAULT_TEMPLATES,
        ...parsed.templates,
      },
    }
  } catch {
    return DEFAULT_CONFIG
  }
}

export function getTemplate(key: keyof SpeakTemplates): string {
  return getConfig().templates[key]
}

export function renderTemplate(key: keyof SpeakTemplates, vars: Record<string, string | number>): string {
  let template = getTemplate(key)
  for (const [k, v] of Object.entries(vars)) {
    template = template.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
  }
  return template
}

export function saveConfig(cfg: HookedConfig): void {
  ensureDir()
  writeFileAtomic(CONFIG_FILE, JSON.stringify(cfg, null, 2))
}

// Voice helpers
export function setVoiceEnabled(enabled: boolean): HookedConfig {
  const cfg = getConfig()
  cfg.voice.enabled = enabled
  saveConfig(cfg)
  return cfg
}

export function setVoiceVolume(volume: number): HookedConfig {
  const cfg = getConfig()
  cfg.voice.volume = Math.max(0, Math.min(1, volume))
  saveConfig(cfg)
  return cfg
}

export function isVoiceEnabled(): boolean {
  return getConfig().voice.enabled
}

export function getVoiceVolume(): number {
  return getConfig().voice.volume
}

// Alert helpers
export function getAlertConfig(): AlertConfig {
  return getConfig().alerts
}

export const config = {
  get: getConfig,
  save: saveConfig,
  getTemplate,
  renderTemplate,
  // Voice
  isVoiceEnabled,
  setVoiceEnabled,
  getVoiceVolume,
  setVoiceVolume,
  // Alerts
  getAlertConfig,
}
