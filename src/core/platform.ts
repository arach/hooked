/**
 * Platform Detection and Payload Normalization
 * 
 * Provides a unified interface for handling hooks from both Claude Code and Amp.
 */

export type Platform = 'claude' | 'amp'

export interface UnifiedPayload {
  platform: Platform
  hook_event_name?: string
  message?: string
  transcript_path?: string
  session_id?: string
  tool_name?: string
  tool_status?: string
  raw: unknown
}

/**
 * Detect platform from CLI arguments or environment
 */
export function detectPlatform(): Platform {
  // Check CLI arg (e.g., `notification.ts <notificationType> <platform>`)
  const arg = process.argv[3]
  if (arg === 'amp') return 'amp'
  
  // Check environment variable
  if (process.env.HOOKED_PLATFORM === 'amp') return 'amp'
  
  return 'claude'
}

/**
 * Normalize Claude Code hook payload to unified format
 */
export function fromClaude(raw: Record<string, unknown>): UnifiedPayload {
  return {
    platform: 'claude',
    hook_event_name: raw?.hook_event_name as string | undefined,
    message: raw?.message as string | undefined,
    transcript_path: raw?.transcript_path as string | undefined,
    session_id: raw?.session_id as string | undefined,
    raw,
  }
}

/**
 * Normalize Amp hook payload to unified format
 * 
 * Amp events can come from:
 * - amp.hooks (tool:pre-execute, tool:post-execute)
 * - amp.permissions (delegate)
 */
export function fromAmp(raw: Record<string, unknown>, notificationType?: string): UnifiedPayload {
  // Amp payloads may have different shapes depending on the hook type
  // tool:post-execute: { tool: { name: string }, status: string, ... }
  // permission delegate: { permission: string, tool: { name: string }, ... }
  
  const tool = raw?.tool as Record<string, unknown> | undefined
  const result = raw?.result as Record<string, unknown> | undefined
  const toolName = (tool?.name ?? raw?.toolName ?? raw?.tool_name) as string | undefined
  const status = (raw?.status ?? result?.status ?? 'completed') as string
  
  // Amp uses threadId or may provide sessionId
  const threadId = (raw?.threadId ?? raw?.sessionId ?? raw?.session_id) as string | undefined
  
  // Workspace path serves as transcript_path equivalent
  const workspacePath = (raw?.workspacePath ?? raw?.workspace_path ?? process.cwd()) as string
  
  // Build a meaningful message from tool info
  let message: string
  if (toolName) {
    message = `${toolName} ${status}`
  } else if (notificationType) {
    message = `${notificationType} ${status}`
  } else {
    message = `Tool ${status}`
  }

  return {
    platform: 'amp',
    hook_event_name: notificationType || 'ToolPostExecute',
    message,
    transcript_path: workspacePath,
    session_id: threadId,
    tool_name: toolName,
    tool_status: status,
    raw,
  }
}

/**
 * Parse raw JSON payload and normalize based on platform
 */
export function parsePayload(
  rawPayload: string,
  platform: Platform,
  notificationType?: string
): { payload: UnifiedPayload | null; wasJson: boolean } {
  try {
    const json = JSON.parse(rawPayload)
    if (typeof json !== 'object' || json === null) {
      return { payload: null, wasJson: true }
    }
    
    const payload = platform === 'amp'
      ? fromAmp(json as Record<string, unknown>, notificationType)
      : fromClaude(json as Record<string, unknown>)
    
    return { payload, wasJson: true }
  } catch {
    return { payload: null, wasJson: false }
  }
}
