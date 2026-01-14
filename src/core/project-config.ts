/**
 * Project-local configuration
 *
 * Reads .hooked.json from project root for project-specific settings.
 *
 * Example .hooked.json:
 * {
 *   "name": "My Project",
 *   "pronunciation": "My Project with custom pronunciation"
 * }
 */

import { join } from 'path'
import { existsSync, readFileSync } from 'fs'

export interface ProjectConfig {
  /** Display name for the project */
  name?: string
  /** How to pronounce the project name (phonetic spelling for TTS) */
  pronunciation?: string
}

const CONFIG_FILENAME = '.hooked.json'

// Cache to avoid repeated file reads
const configCache = new Map<string, ProjectConfig | null>()

/**
 * Read project config from .hooked.json in the given directory.
 * Returns null if file doesn't exist or is invalid.
 */
export function readProjectConfig(projectPath: string): ProjectConfig | null {
  // Check cache first
  if (configCache.has(projectPath)) {
    return configCache.get(projectPath) ?? null
  }

  const configPath = join(projectPath, CONFIG_FILENAME)

  if (!existsSync(configPath)) {
    configCache.set(projectPath, null)
    return null
  }

  try {
    const content = readFileSync(configPath, 'utf-8')
    const parsed = JSON.parse(content) as ProjectConfig

    // Validate it's an object with expected fields
    if (typeof parsed !== 'object' || parsed === null) {
      configCache.set(projectPath, null)
      return null
    }

    const config: ProjectConfig = {}

    if (typeof parsed.name === 'string' && parsed.name.trim()) {
      config.name = parsed.name.trim()
    }

    if (typeof parsed.pronunciation === 'string' && parsed.pronunciation.trim()) {
      config.pronunciation = parsed.pronunciation.trim()
    }

    configCache.set(projectPath, config)
    return config
  } catch {
    configCache.set(projectPath, null)
    return null
  }
}

/**
 * Get the pronunciation for a project.
 * Priority: pronunciation field > name field > null
 */
export function getProjectPronunciation(projectPath: string): string | null {
  const config = readProjectConfig(projectPath)
  if (!config) return null

  return config.pronunciation ?? config.name ?? null
}

/**
 * Get the display name for a project from config.
 * Returns null if no config or name field.
 */
export function getProjectName(projectPath: string): string | null {
  const config = readProjectConfig(projectPath)
  return config?.name ?? null
}

/**
 * Clear the config cache (useful for testing or when configs change)
 */
export function clearConfigCache(): void {
  configCache.clear()
}

export const projectConfig = {
  read: readProjectConfig,
  getPronunciation: getProjectPronunciation,
  getName: getProjectName,
  clearCache: clearConfigCache,
}
