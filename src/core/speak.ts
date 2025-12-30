import { SpeakEasy } from '@arach/speakeasy'
import { config } from './config'

// Create SpeakEasy instance
// Configuration is managed by SpeakEasy via ~/.config/speakeasy/settings.json
// Run `speakeasy config` to set up providers and API keys
const speakEasy = new SpeakEasy({})

/**
 * Speak a message using SpeakEasy (if enabled in config)
 */
export async function speak(message: string): Promise<void> {
  // Check if speak is enabled in config
  if (!config.getFlag('speak')) {
    return
  }

  try {
    await speakEasy.speak(message, { priority: 'high' })
  } catch (error) {
    // Silently fail if SpeakEasy isn't configured
    console.error(`[hooked] Failed to speak: ${error instanceof Error ? error.message : String(error)}`)
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
