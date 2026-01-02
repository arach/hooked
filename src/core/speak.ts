import { SpeakEasy } from '@arach/speakeasy'
import { config } from './config'
import { history } from './history'

// Get SpeakEasy instance with current volume from config
// Configuration is managed by SpeakEasy via ~/.config/speakeasy/settings.json
// Run `speakeasy config` to set up providers and API keys
function getSpeakEasy(): SpeakEasy {
  const volume = config.getVoiceVolume()
  return new SpeakEasy({ volume })
}

export interface SpeakOptions {
  priority?: 'high' | 'normal' | 'low'
  volume?: number  // Override config volume
  sessionId?: string  // For history logging
}

/**
 * Speak a message using SpeakEasy (if enabled in config)
 */
export async function speak(message: string, options?: SpeakOptions): Promise<void> {
  // Check if voice is enabled in config
  if (!config.isVoiceEnabled()) {
    console.error('[hooked:speak] Voice disabled in config')
    return
  }

  const volume = options?.volume ?? config.getVoiceVolume()
  console.error(`[hooked:speak] Speaking (vol ${volume}): "${message}"`)

  // Extract project from message if it starts with "In <project>,"
  const projectMatch = message.match(/^In ([^,]+),/)
  const project = projectMatch?.[1] || 'hooked'

  // Log to history - captures everything that's spoken
  history.log({
    type: 'spoken',
    project,
    session_id: options?.sessionId,
    message,
    payload: {
      priority: options?.priority ?? 'high',
      volume,
    },
  })

  try {
    const speaker = getSpeakEasy()
    await speaker.speak(message, {
      priority: options?.priority ?? 'high',
    })
    console.error('[hooked:speak] Done speaking')
  } catch (error) {
    console.error(`[hooked:speak] Failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Announce continuation activation
 */
export async function announceContinuation(preset: string, project?: string, objective?: string): Promise<void> {
  const location = project ? `In ${project}` : 'Session'
  const obj = objective ? ` for: ${objective}` : ''
  const message = `${location}, continuation activated. Preset: ${preset}${obj}`
  await speak(message)
}

/**
 * Announce continuation completion
 */
export async function announceCompletion(preset: string, project?: string): Promise<void> {
  const location = project ? `In ${project}` : 'Session'
  const message = `${location}, continuation complete. ${preset} objective achieved.`
  await speak(message)
}
