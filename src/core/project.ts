/**
 * Project identification utilities.
 *
 * Claude Code encodes project paths as folder names:
 *   /Users/arach/dev/my-project → Users-arach-dev-my-project
 *
 * This module provides consistent project matching between CLI and hooks.
 *
 * Configuration priority for project names:
 * 1. .hooked.json - structured config with name and pronunciation fields
 * 2. .projectName - legacy plain text file (for backwards compatibility)
 * 3. Basename of project path with dots replaced for speech clarity
 */

import { basename, join } from 'path'
import { existsSync, readFileSync } from 'fs'
import { projectConfig } from './project-config'

/**
 * Convert a filesystem path to Claude's project folder name format.
 * /Users/arach/dev/my-project → Users-arach-dev-my-project
 */
export function pathToProjectFolder(path: string): string {
  return path.replace(/^\//, '').replace(/\//g, '-')
}

/**
 * Reverse a project folder back to filesystem path.
 * -Users-arach-dev-my-project → /Users/arach/dev/my-project
 * Users-arach-dev-my-project → /Users/arach/dev/my-project (legacy format)
 */
export function folderToPath(folder: string): string {
  // Claude encodes leading / as leading -, so just replace all - with /
  const path = folder.replace(/-/g, '/')
  // Ensure it starts with / (handles both formats)
  return path.startsWith('/') ? path : '/' + path
}

/**
 * Read custom project name from config files.
 * Priority: .hooked.json name field > .projectName file
 * Returns null if no custom name configured.
 */
export function getCustomName(projectPath: string): string | null {
  // Check .hooked.json first
  const configName = projectConfig.getName(projectPath)
  if (configName) return configName

  // Fall back to legacy .projectName file
  const namePath = join(projectPath, '.projectName')
  if (!existsSync(namePath)) return null

  try {
    const content = readFileSync(namePath, 'utf-8').trim()
    return content || null
  } catch {
    return null
  }
}

/**
 * Get the pronunciation for a project (for TTS).
 * Priority: .hooked.json pronunciation > .hooked.json name > display name
 */
export function getPronunciation(projectPath: string): string {
  // Check .hooked.json pronunciation field first
  const pronunciation = projectConfig.getPronunciation(projectPath)
  if (pronunciation) return pronunciation

  // Fall back to display name
  return getDisplayName(projectPath)
}

/**
 * Get pronunciation from a project folder.
 * Users-arach-dev-my-project → pronunciation or display name
 */
export function getPronunciationFromFolder(folder: string): string {
  const path = folderToPath(folder)
  return getPronunciation(path)
}

/**
 * Extract project folder name from a Claude transcript path.
 * /Users/arach/.claude/projects/Users-arach-dev-my-project/session.jsonl
 * → Users-arach-dev-my-project
 */
export function extractProjectFolder(transcriptPath: string): string | null {
  const match = transcriptPath.match(/projects\/([^/]+)\//)
  return match?.[1] || null
}

/**
 * Get a display-friendly project name from a filesystem path.
 * Checks for .projectName file first, falls back to basename.
 */
export function getDisplayName(path: string): string {
  // Check for custom project name
  const customName = getCustomName(path)
  if (customName) return customName

  const name = basename(path)
  // Replace dots with "dot" for speech clarity
  return name.replace(/\./g, ' dot ')
}

/**
 * Get display name from a project folder.
 * Users-arach-dev-my-project → my-project (or custom name from .projectName)
 */
export function getDisplayNameFromFolder(folder: string): string {
  // Try to reverse the folder encoding to get the path
  const path = folderToPath(folder)

  // Check for custom project name at that path
  const customName = getCustomName(path)
  if (customName) return customName

  // Fall back to basename of the reconstructed path
  const name = basename(path)
  return name.replace(/\./g, ' dot ')
}

/**
 * Check if a project folder matches a filesystem path.
 */
export function folderMatchesPath(folder: string, path: string): boolean {
  return folder === pathToProjectFolder(path)
}

export const project = {
  pathToFolder: pathToProjectFolder,
  folderToPath,
  extractFolder: extractProjectFolder,
  getDisplayName,
  getDisplayNameFromFolder,
  getPronunciation,
  getPronunciationFromFolder,
  getCustomName,
  folderMatchesPath,
}
