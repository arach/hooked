import { homedir } from 'os'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

export interface SpeakTemplates {
  loopStarted: string      // vars: {project}, {goal}
  checkPassed: string      // vars: {project}
  checkFailed: string      // vars: {project}
  pausing: string          // vars: {project}
  manualRound: string      // vars: {project}, {round}, {objective}
  missionComplete: string  // no vars
}

export interface HookedConfig {
  flags: {
    speak: boolean
    logging: boolean
  }
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
}

const DEFAULT_CONFIG: HookedConfig = {
  flags: {
    speak: true,
    logging: true,
  },
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
    const parsed = JSON.parse(content) as Partial<HookedConfig>
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      flags: {
        ...DEFAULT_CONFIG.flags,
        ...parsed.flags,
      },
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

export function saveConfig(config: HookedConfig): void {
  ensureDir()
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}

export function setFlag(flag: keyof HookedConfig['flags'], value: boolean): HookedConfig {
  const config = getConfig()
  config.flags[flag] = value
  saveConfig(config)
  return config
}

export function getFlag(flag: keyof HookedConfig['flags']): boolean {
  return getConfig().flags[flag]
}

export const config = {
  get: getConfig,
  save: saveConfig,
  getFlag,
  setFlag,
  getTemplate,
  renderTemplate,
}
