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
    console.error('[hooked:speak] Speak disabled in config')
    return
  }

  console.error(`[hooked:speak] Speaking: "${message}"`)
  try {
    await speakEasy.speak(message, { priority: 'high' })
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
