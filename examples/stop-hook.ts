#!/usr/bin/env node
/**
 * Example Stop Hook for Claude Code
 *
 * Two modes:
 *
 * 1. CONTEXTUAL (toggle with /hooked on/off):
 *    - /hooked on "fix the login form"
 *    - Claude works until you say /hooked off
 *
 * 2. COMMAND-BASED (always active):
 *    - Keep working until a command succeeds (build, lint, etc.)
 *
 * Setup:
 * 1. Copy this file to: .claude/hooks/stop.ts
 * 2. Add to .claude/settings.json:
 *    {
 *      "hooks": {
 *        "Stop": [{
 *          "hooks": [{
 *            "type": "command",
 *            "command": "npx tsx $CLAUDE_PROJECT_DIR/.claude/hooks/stop.ts"
 *          }]
 *        }]
 *      }
 *    }
 */

import { createStopHook, maxIterations, continueUntil, commandSucceeds } from 'hooked/stop'

// Option A: Contextual continuation (toggle with /hooked on/off)
const contextualHook = createStopHook([
  maxIterations(30),
  continueUntil(),  // Reads from ~/.hooked/continue.json
])

// Option B: Command-based (always runs until command succeeds)
const commandHook = createStopHook([
  maxIterations(30),
  commandSucceeds('pnpm build'),
])

// Use contextual by default
contextualHook()
