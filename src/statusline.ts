#!/usr/bin/env node
/**
 * Hooked Status Line for Claude Code
 *
 * Modes:
 *   --vanilla (default): Full statusline with project:id │ hooked-state │ tokens
 *   --widget: Just hooked state for embedding in tools like ccstatusline
 */

import { continuation } from './continuation'
import { alerts } from './core/alerts'
import { config } from './core/config'

interface ClaudeStatusInput {
  session_id?: string
  cwd?: string
  model?: { display_name?: string }
  context_window?: {
    used?: number
    max?: number
  }
}

function formatTokens(used?: number, max?: number): string {
  if (!used) return ''

  const formatNum = (n: number): string => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(0)}k`
    return `${n}`
  }

  if (max) {
    return `${formatNum(used)}/${formatNum(max)}`
  }
  return formatNum(used)
}

async function main(): Promise<void> {
  const isWidget = process.argv.includes('--widget')

  // Read Claude's JSON input from stdin
  let input: ClaudeStatusInput = {}
  try {
    const chunks: Buffer[] = []
    for await (const chunk of process.stdin) {
      chunks.push(chunk)
    }
    const data = Buffer.concat(chunks).toString('utf-8')
    if (data.trim()) {
      input = JSON.parse(data)
    }
  } catch {
    // Continue with defaults
  }

  const sessionId = input.session_id || ''
  const cwd = input.cwd || process.cwd()
  const projectName = cwd.split('/').pop() || 'unknown'

  // Collect hooked-specific state
  const hookedParts: string[] = []

  const sessions = continuation.getActiveSessions()
  const thisSession = sessions.find(s => s.sessionId === sessionId)
  const pending = continuation.getPending()

  if (thisSession) {
    hookedParts.push(`⟳${thisSession.state.mode}`)
  } else if (pending) {
    hookedParts.push('⏳')
  }

  if (continuation.isPaused()) {
    hookedParts.push('⏸')
  }

  const alert = alerts.get(sessionId)
  if (alert) {
    hookedParts.push(`🔔${alerts.getAgeMinutes(alert)}m`)
  }

  if (!config.isVoiceEnabled()) {
    hookedParts.push('🔇')
  }

  // Widget mode: just output hooked state (or nothing if no state)
  if (isWidget) {
    if (hookedParts.length > 0) {
      console.log(hookedParts.join(' '))
    }
    // Output nothing if no hooked state - widget will be empty
    return
  }

  // Vanilla mode: full statusline
  const parts: string[] = []

  // Session ID
  if (sessionId) {
    parts.push(`${projectName}:${sessionId.slice(0, 6)}`)
  } else {
    parts.push(projectName)
  }

  // Add hooked state
  parts.push(...hookedParts)

  // Tokens
  const tokenStr = formatTokens(input.context_window?.used, input.context_window?.max)
  if (tokenStr) {
    parts.push(tokenStr)
  }

  console.log(parts.join(' │ '))
}

main().catch(() => {
  console.log('hooked')
})
