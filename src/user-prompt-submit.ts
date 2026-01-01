#!/usr/bin/env node
/**
 * UserPromptSubmit Hook
 *
 * Fires when the user sends a message to Claude.
 * Clears any pending alerts for this session (user has responded).
 */

import { alerts } from './core/alerts';

interface PromptSubmitPayload {
  session_id?: string;
  prompt?: string;
  [key: string]: unknown;
}

async function main(): Promise<void> {
  let payload: PromptSubmitPayload;

  try {
    const raw = await readStdin();
    payload = JSON.parse(raw);
  } catch (error) {
    // If we can't parse, just exit silently - don't block user input
    process.exit(0);
  }

  const sessionId = payload.session_id;

  if (sessionId) {
    // Check if there's a pending alert for this session
    const alert = alerts.get(sessionId);

    if (alert) {
      // Clear the alert - user has responded
      alerts.clear(sessionId);
      console.error(`[user-prompt-submit] Cleared alert for session ${sessionId.slice(0, 8)}`);
    }
  }

  // Always exit cleanly - never block user input
  process.exit(0);
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { data += chunk });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);

    // Timeout after 1 second - don't block user
    setTimeout(() => resolve(data), 1000);
  });
}

main().catch(() => {
  // Exit silently on any error - never block user input
  process.exit(0);
});
