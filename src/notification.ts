#!/usr/bin/env node
/**
 * Notification Hook
 *
 * Speaks notifications and tracks pending alerts for reminders.
 * Spawns a background reminder process when an alert is set.
 */

import { homedir } from 'os';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import winston from 'winston';
import { speak } from './core/speak';
import { project } from './core/project';
import { alerts } from './core/alerts';
import { config } from './core/config';
import { history } from './core/history';
import { detectPlatform, parsePayload, type Platform, type UnifiedPayload } from './core/platform';

// Types
interface NoOpLogger {
  info: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

type Logger = winston.Logger | NoOpLogger;

const enableFileLogging = process.env.HOOKED_LOG_FILE === 'true';
const logger: Logger = enableFileLogging ? createLogger() : createNoOpLogger();
const notificationType = process.argv[2];
const platform = detectPlatform();

logger.info('Notification script started', { notificationType, platform });

void main();

async function main() {
  let rawPayload: string;
  try {
    rawPayload = await readStdin();
  } catch (error) {
    logger.error('Failed to read notification payload', { error: extractErrorMessage(error) });
    return;
  }

  logger.info('Received payload from stdin', { payloadLength: rawPayload.length, platform });

  const parsedPayloadResult = parsePayload(rawPayload, platform, notificationType);
  logger.info('Created notification data object', {
    type: notificationType,
    platform,
    hasParsedPayload: Boolean(parsedPayloadResult.payload),
    wasJson: parsedPayloadResult.wasJson
  });

  try {
    await handleNotification(parsedPayloadResult.payload);
  } catch (error) {
    logger.error('Failed to handle notification', { error: extractErrorMessage(error) });
  }
}

async function handleNotification(parsedPayload: UnifiedPayload | null) {
  const hookEventName = parsedPayload?.hook_event_name;
  const message = parsedPayload?.message;
  const transcriptPath = parsedPayload?.transcript_path;
  const sessionId = parsedPayload?.session_id;
  const payloadPlatform = parsedPayload?.platform ?? platform;

  logger.info('Processing notification', { transcriptPath, hookEventName, sessionId, platform: payloadPlatform });

  // Extract project info
  const projectFolder = project.extractFolder(transcriptPath || '') || 'unknown';
  const displayName = project.getDisplayNameFromFolder(projectFolder);
  const pronunciation = project.getPronunciationFromFolder(projectFolder);

  logger.info('Extracted project info', { projectFolder, displayName, pronunciation });

  // Log to history (full payload stored in SQLite)
  const eventType = hookEventName === 'Stop' ? 'stop' : 'notification';
  const rawPayloadData = parsedPayload?.raw;
  const payloadForHistory = (rawPayloadData && typeof rawPayloadData === 'object' && !Array.isArray(rawPayloadData))
    ? rawPayloadData as Record<string, unknown>
    : undefined;
  
  history.log({
    type: eventType,
    project: displayName,
    session_id: sessionId,
    hook_event_name: hookEventName,
    message,
    payload: payloadForHistory,
  });

  // Determine if this notification needs attention (uses notification_type from payload)
  const alertConfig = config.getAlertConfig();
  const alertType = shouldAlert(parsedPayload);
  const notificationType = (parsedPayload?.raw as Record<string, unknown>)?.notification_type;

  // Only speak for actionable notifications (permission requests, errors)
  // Skip idle_prompt - these are natural stopping points, not urgent
  if (notificationType !== 'idle_prompt') {
    const speechMessage = buildSpeechMessage(pronunciation, hookEventName, message, payloadPlatform);
    logger.info('Speaking', { speechMessage, displayName, pronunciation, platform: payloadPlatform });
    await speak(speechMessage, { sessionId });
    // Print to console for hook feedback
    console.log(`🔊 ${speechMessage}`);
  } else {
    logger.info('Skipping speech for idle_prompt (natural stopping point)', { displayName });
  }

  if (sessionId && alertConfig.enabled && alertType) {
    // Check if there's already an active reminder for this session
    const existingAlert = alerts.get(sessionId);
    const hasActiveReminder = existingAlert?.reminderPid != null;

    // Set/update the pending alert
    alerts.set({
      sessionId,
      project: displayName,
      cwd: projectFolder,
      type: alertType,
      message: message || hookEventName || 'Notification',
    });

    logger.info('Set pending alert', { sessionId, alertType, project: displayName });

    // Only spawn reminder if there isn't one already running
    if (!hasActiveReminder) {
      spawnReminderProcess(sessionId);
      logger.info('Spawned reminder process for session', { sessionId });
    } else {
      logger.info('Reminder already active for session, skipping spawn', { sessionId, pid: existingAlert.reminderPid });
    }
  } else if (alertType === null) {
    logger.info('Informational notification, no alert needed', { hookEventName, message, notificationType });
  }
}

/**
 * Determine if this notification needs user attention (should create an alert).
 * Uses the notification_type field from Claude Code's payload for accurate categorization.
 * Returns the alert type if yes, null if it's just informational.
 */
function shouldAlert(parsedPayload: UnifiedPayload | null): string | null {
  const notificationType = (parsedPayload?.raw as Record<string, unknown>)?.notification_type;
  const msg = (parsedPayload?.message || '').toLowerCase();

  // Use notification_type from payload (most reliable)
  if (notificationType === 'permission_prompt') {
    return 'permission';
  }

  // idle_prompt = natural stopping point, no alert needed
  if (notificationType === 'idle_prompt') {
    return null;
  }

  // Fallback to message content for other cases (errors, etc.)
  if (msg.includes('error') || msg.includes('failed')) {
    return 'attention';
  }

  // Everything else is informational - no alert needed
  return null;
}

function spawnReminderProcess(sessionId: string): void {
  const tsxPath = join(homedir(), '.hooked', 'node_modules', '.bin', 'tsx');
  const reminderScript = join(homedir(), '.hooked', 'src', 'reminder.ts');

  // Spawn detached so it continues after this process exits
  const child = spawn(tsxPath, [reminderScript, sessionId], {
    detached: true,
    stdio: 'ignore',
  });

  // Unref so this process can exit
  child.unref();

  // Track the PID
  if (child.pid) {
    alerts.setReminderPid(sessionId, child.pid);
  }
}

function createLogger(): winston.Logger {
  const logDir = join(homedir(), 'logs', 'claude-hooks');
  const logFile = join(logDir, 'notification.log');

  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }

  return winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.printf((info) => {
        const { timestamp, level, message, ...meta } = info;
        const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
      })
    ),
    transports: [
      new winston.transports.File({ filename: logFile }),
      new winston.transports.Console({
        format: winston.format.printf((info) => {
          const { level, message, ...meta } = info;
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${level}: ${message}${metaStr}`;
        })
      })
    ]
  });
}

function createNoOpLogger(): NoOpLogger {
  return {
    info: () => {},
    error: () => {}
  };
}

// Utility functions
function buildSpeechMessage(projectName: string, hookEventName?: string, message?: string, msgPlatform?: Platform): string {
  const agentName = msgPlatform === 'amp' ? 'Amp' : 'Claude';
  
  if (hookEventName === 'Stop') {
    return `In ${projectName}, ${agentName} completed a task`;
  }

  // Clean up platform references in message
  let cleanMessage = message ?? 'Notification received';
  cleanMessage = cleanMessage.replace(/Claude Code/g, 'Claude');
  cleanMessage = cleanMessage.replace(/Amp/g, 'Amp'); // Keep Amp as-is
  
  return `In ${projectName}, ${cleanMessage}`;
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

function extractErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Handle process errors
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  const errorMessage = reason instanceof Error ? reason.message : String(reason);
  logger.error('Unhandled promise rejection', { reason: errorMessage });
  process.exit(1);
});

/* Test:
 * echo '{"message": "Build completed successfully", "transcript_path": "/Users/arach/dev/speech-service"}' | npx tsx notification.ts
 */
