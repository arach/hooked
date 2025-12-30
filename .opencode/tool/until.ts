/**
 * Until Tools - Control the until loop from within OpenCode
 *
 * These tools allow the agent (or user via commands) to start/stop until loops.
 */

import { tool } from "@opencode-ai/plugin"
import { existsSync, readFileSync, unlinkSync, writeFileSync, mkdirSync } from "fs"
import { homedir } from "os"
import { join } from "path"

// State file location (shared with plugin)
const HOOKED_HOME = join(homedir(), ".hooked")
const UNTIL_FILE = join(HOOKED_HOME, "opencode-until.json")

interface UntilState {
  mode: "check" | "manual"
  objective?: string
  check?: string
  iteration: number
  createdAt: string
}

function ensureDir(): void {
  if (!existsSync(HOOKED_HOME)) {
    mkdirSync(HOOKED_HOME, { recursive: true })
  }
}

function getUntil(): UntilState | null {
  if (!existsSync(UNTIL_FILE)) return null
  try {
    return JSON.parse(readFileSync(UNTIL_FILE, "utf-8"))
  } catch {
    return null
  }
}

function setUntil(state: UntilState): void {
  ensureDir()
  writeFileSync(UNTIL_FILE, JSON.stringify(state, null, 2))
}

function clearUntil(): void {
  if (existsSync(UNTIL_FILE)) {
    unlinkSync(UNTIL_FILE)
  }
}

// Tool: Start a check-based until loop
export const check = tool({
  description: "Start an until loop that continues until a shell command passes (exits 0). Use this to keep working until tests pass, build succeeds, etc.",
  args: {
    command: tool.schema.string().describe("Shell command to run (e.g., 'pnpm test', 'pnpm build')"),
  },
  async execute(args) {
    const state: UntilState = {
      mode: "check",
      check: args.command,
      iteration: 0,
      createdAt: new Date().toISOString(),
    }
    setUntil(state)
    return `Until loop started. Will keep working until "${args.command}" passes (exits 0).`
  },
})

// Tool: Start a manual objective-based until loop
export const objective = tool({
  description: "Start an until loop that continues indefinitely until manually stopped. Use this for open-ended objectives.",
  args: {
    goal: tool.schema.string().describe("The objective to work toward"),
  },
  async execute(args) {
    const state: UntilState = {
      mode: "manual",
      objective: args.goal,
      iteration: 0,
      createdAt: new Date().toISOString(),
    }
    setUntil(state)
    return `Until loop started. Will keep working toward: "${args.goal}". Use until_off to stop.`
  },
})

// Tool: Stop the current until loop
export const off = tool({
  description: "Stop the current until loop",
  args: {},
  async execute() {
    const state = getUntil()
    if (!state) {
      return "No active until loop."
    }
    const info = state.mode === "check"
      ? `check: ${state.check}`
      : `objective: ${state.objective}`
    clearUntil()
    return `Until loop stopped after ${state.iteration} iterations. Was: ${info}`
  },
})

// Tool: Get status of current until loop
export const status = tool({
  description: "Get the status of the current until loop",
  args: {},
  async execute() {
    const state = getUntil()
    if (!state) {
      return "No active until loop."
    }
    const info = state.mode === "check"
      ? `Check command: ${state.check}`
      : `Objective: ${state.objective}`
    return `Until loop active (${state.mode} mode)\n${info}\nIterations: ${state.iteration}\nStarted: ${state.createdAt}`
  },
})
