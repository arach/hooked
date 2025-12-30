import { homedir } from 'os'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

export interface HookedConfig {
  activePreset: string | null
  flags: {
    speak: boolean
    logging: boolean
  }
}

const HOOKED_HOME = join(homedir(), '.hooked')
const CONFIG_FILE = join(HOOKED_HOME, 'config.json')

const DEFAULT_CONFIG: HookedConfig = {
  activePreset: null,
  flags: {
    speak: true,
    logging: true,
  },
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
    }
  } catch {
    return DEFAULT_CONFIG
  }
}

export function saveConfig(config: HookedConfig): void {
  ensureDir()
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}

export function setActivePreset(preset: string | null): HookedConfig {
  const config = getConfig()
  config.activePreset = preset
  saveConfig(config)
  return config
}

export function getActivePreset(): string | null {
  return getConfig().activePreset
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
  getActivePreset,
  setActivePreset,
  getFlag,
  setFlag,
}
