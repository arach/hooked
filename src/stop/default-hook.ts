#!/usr/bin/env node
/**
 * Default Stop Hook for hooked
 *
 * This is the main stop hook that gets deployed to ~/.claude/hooks/
 * It combines:
 * - maxIterations: Safety valve (default 30)
 * - continueUntil: Contextual continuation (toggle with /hooked on/off)
 *
 * Deploy with: bun run deploy
 */

import { createStopHook, maxIterations, continueUntil } from './index'

const MAX_ITERATIONS = parseInt(process.env.HOOKED_MAX_ITERATIONS ?? '3', 10)

const hook = createStopHook([
  maxIterations(MAX_ITERATIONS),
  continueUntil(),
])

hook()
