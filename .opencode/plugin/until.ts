/**
 * Until Plugin - Keep OpenCode working until a condition is met
 *
 * This plugin listens for session.idle events and automatically
 * sends a continuation message if an "until" loop is active.
 */

import type { Plugin } from "@opencode-ai/plugin"
import { existsSync, readFileSync, unlinkSync, writeFileSync, mkdirSync } from "fs"
import { homedir } from "os"
import { join } from "path"

// State file location
const HOOKED_HOME = join(homedir(), ".hooked")
const UNTIL_FILE = join(HOOKED_HOME, "opencode-until.json")

export type UntilMode = "check" | "manual"

export interface UntilState {
  mode: UntilMode
  objective?: string  // For manual mode
  check?: string      // For check mode (command to run)
  iteration: number
  createdAt: string
}

function ensureDir(): void {
  if (!existsSync(HOOKED_HOME)) {
    mkdirSync(HOOKED_HOME, { recursive: true })
  }
}

export function getUntil(): UntilState | null {
  if (!existsSync(UNTIL_FILE)) return null
  try {
    return JSON.parse(readFileSync(UNTIL_FILE, "utf-8"))
  } catch {
    return null
  }
}

export function setUntil(state: UntilState): void {
  ensureDir()
  writeFileSync(UNTIL_FILE, JSON.stringify(state, null, 2))
}

export function clearUntil(): void {
  if (existsSync(UNTIL_FILE)) {
    unlinkSync(UNTIL_FILE)
  }
}

export function incrementIteration(): number {
  const state = getUntil()
  if (!state) return 0
  state.iteration = (state.iteration || 0) + 1
  setUntil(state)
  return state.iteration
}

export const UntilPlugin: Plugin = async ({ client, $ }) => {
  return {
    event: async ({ event }) => {
      if (event.type !== "session.idle") return

      const sessionID = event.properties.sessionID
      const state = getUntil()

      if (!state) return

      // Check mode: run command and continue if it fails
      if (state.mode === "check" && state.check) {
        try {
          await $`${state.check}`.quiet()
          // Check passed - we're done!
          clearUntil()
          await client.tui.showToast({
            body: {
              message: `Check passed: ${state.check}`,
              variant: "success",
            },
          })
          return
        } catch {
          // Check failed - continue working
          const iteration = incrementIteration()
          await client.session.prompt({
            path: { id: sessionID },
            body: {
              parts: [{
                type: "text",
                text: `[Until loop iteration ${iteration}] The check "${state.check}" failed. Keep working to fix it.`,
              }],
            },
          })
        }
        return
      }

      // Manual mode: always continue with objective
      if (state.mode === "manual" && state.objective) {
        const iteration = incrementIteration()
        await client.session.prompt({
          path: { id: sessionID },
          body: {
            parts: [{
              type: "text",
              text: `[Until loop iteration ${iteration}] Continue working toward: ${state.objective}`,
            }],
          },
        })
      }
    },
  }
}
