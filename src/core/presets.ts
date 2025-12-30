import { execSync } from 'child_process'

export interface Preset {
  name: string
  description: string
  /** Command to check if work is done (exit 0 = done). If undefined, uses manual mode. */
  check?: string
  /** Max iterations before forcing stop. Defaults to 30. */
  maxIterations?: number
  /** Message shown when blocking */
  blockMessage?: string
}

/**
 * Built-in presets
 */
export const PRESETS: Record<string, Preset> = {
  manual: {
    name: 'manual',
    description: 'Keep working until explicitly stopped',
    maxIterations: 30,
    blockMessage: 'Continuation mode active - keep working',
  },
  test: {
    name: 'test',
    description: 'Keep working until tests pass',
    check: 'pnpm test',
    maxIterations: 30,
    blockMessage: 'Tests still failing - keep working',
  },
  build: {
    name: 'build',
    description: 'Keep working until build succeeds',
    check: 'pnpm build',
    maxIterations: 30,
    blockMessage: 'Build still broken - keep working',
  },
  typecheck: {
    name: 'typecheck',
    description: 'Keep working until typecheck passes',
    check: 'pnpm typecheck',
    maxIterations: 30,
    blockMessage: 'Type errors remain - keep working',
  },
  lint: {
    name: 'lint',
    description: 'Keep working until lint passes',
    check: 'pnpm lint',
    maxIterations: 30,
    blockMessage: 'Lint errors remain - keep working',
  },
}

export function getPreset(name: string): Preset | undefined {
  return PRESETS[name]
}

export function listPresets(): Preset[] {
  return Object.values(PRESETS)
}

export function presetNames(): string[] {
  return Object.keys(PRESETS)
}

/**
 * Evaluate if a preset's check condition is satisfied
 * Returns true if work is DONE (Claude can stop)
 */
export function evaluatePreset(preset: Preset): { done: boolean; reason: string } {
  // Manual mode - never done until user says off
  if (!preset.check) {
    return {
      done: false,
      reason: preset.blockMessage ?? 'Manual continuation active',
    }
  }

  // Check mode - run command
  try {
    execSync(preset.check, {
      stdio: 'pipe',
      timeout: 120000, // 2 minute timeout for commands like test suites
    })
    // Command succeeded - work is done!
    return {
      done: true,
      reason: `Check passed: ${preset.check}`,
    }
  } catch {
    // Command failed - keep working
    return {
      done: false,
      reason: preset.blockMessage ?? `Check failing: ${preset.check}`,
    }
  }
}

export const presets = {
  get: getPreset,
  list: listPresets,
  names: presetNames,
  evaluate: evaluatePreset,
  all: PRESETS,
}
