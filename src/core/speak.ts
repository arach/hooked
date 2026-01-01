import { SpeakEasy } from '@arach/speakeasy'
import { config } from './config'

// Create SpeakEasy instance
// Configuration is managed by SpeakEasy via ~/.config/speakeasy/settings.json
// Run `speakeasy config` to set up providers and API keys
const speakEasy = new SpeakEasy({})

export interface SpeakOptions {
  priority?: 'high' | 'normal' | 'low'
  volume?: number  // Override config volume
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

  try {
    await speakEasy.speak(message, {
      priority: options?.priority ?? 'high',
      // Note: volume support depends on SpeakEasy/provider
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
