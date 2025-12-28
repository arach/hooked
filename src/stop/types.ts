export interface StopHookInput {
  session_id: string
  transcript_path: string
  permission_mode: string
  hook_event_name: string
  stop_hook_active: boolean
}

export interface StopHookResponse {
  decision: 'approve' | 'block'
  reason?: string
}

export interface EvaluatorContext {
  input: StopHookInput
  iteration: number
  project?: string
}

export interface EvaluatorResult {
  shouldContinue: boolean
  reason: string
}

export type Evaluator = (ctx: EvaluatorContext) => EvaluatorResult | Promise<EvaluatorResult>

export interface StopHookOptions {
  /** Optional: enable speech notifications via SpeakEasy */
  notify?: boolean
  /** Optional: callback when hook blocks (Claude continues) */
  onBlock?: (ctx: EvaluatorContext & { reason: string }) => void | Promise<void>
  /** Optional: callback when hook approves (Claude stops) */
  onApprove?: (ctx: EvaluatorContext) => void | Promise<void>
}
