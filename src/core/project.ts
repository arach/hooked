/**
 * Project identification utilities.
 *
 * Claude Code encodes project paths as folder names:
 *   /Users/arach/dev/my-project → Users-arach-dev-my-project
 *
 * This module provides consistent project matching between CLI and hooks.
 */

import { basename } from 'path'

/**
 * Convert a filesystem path to Claude's project folder name format.
 * /Users/arach/dev/my-project → Users-arach-dev-my-project
 */
export function pathToProjectFolder(path: string): string {
  return path.replace(/^\//, '').replace(/\//g, '-')
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
 * For voice announcements - just the basename.
 */
export function getDisplayName(path: string): string {
  const name = basename(path)
  // Replace dots with "dot" for speech clarity
  return name.replace(/\./g, ' dot ')
}

/**
 * Get display name from a project folder.
 * Users-arach-dev-my-project → my-project
 *
 * Note: This assumes the last path segment is the project name.
 * For /Users/arach/dev/my-project, the folder is Users-arach-dev-my-project
 * and the last segment after the known prefix pattern is "my-project".
 */
export function getDisplayNameFromFolder(folder: string): string {
  // The folder encodes the full path: Users-arach-dev-my-project
  // We need to find where the actual project name starts.
  //
  // Strategy: The project is typically under a "dev" or similar directory.
  // Look for common patterns and take everything after.
  //
  // Better strategy: We can't reliably reverse this without knowing the
  // original path structure. Instead, store the display name when registering.
  //
  // Fallback: Just return the folder as-is (not ideal but safe)
  return folder.replace(/\./g, ' dot ')
}

/**
 * Check if a project folder matches a filesystem path.
 */
export function folderMatchesPath(folder: string, path: string): boolean {
  return folder === pathToProjectFolder(path)
}

export const project = {
  pathToFolder: pathToProjectFolder,
  extractFolder: extractProjectFolder,
  getDisplayName,
  getDisplayNameFromFolder,
  folderMatchesPath,
}
