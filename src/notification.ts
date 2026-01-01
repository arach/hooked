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

// Types
interface NoOpLogger {
  info: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

type Logger = winston.Logger | NoOpLogger;

interface NotificationPayload {
  hook_event_name?: string;
  message?: string;
  transcript_path?: string;
  session_id?: string;
  [key: string]: unknown;
}

const enableFileLogging = process.env.HOOKED_LOG_FILE === 'true';
const logger: Logger = enableFileLogging ? createLogger() : createNoOpLogger();
const notificationType = process.argv[2];

logger.info('Notification script started', { notificationType });

void main();

async function main() {
  let payload: string;
  try {
    payload = await readStdin();
  } catch (error) {
    logger.error('Failed to read notification payload', { error: extractErrorMessage(error) });
    return;
  }

  logger.info('Received payload from stdin', { payloadLength: payload.length });

  const parsedPayloadResult = parseNotificationPayload(payload);
  logger.info('Created notification data object', {
    type: notificationType,
    hasParsedPayload: Boolean(parsedPayloadResult.payload),
    wasJson: parsedPayloadResult.wasJson
  });

  try {
    await handleNotification(parsedPayloadResult.payload);
  } catch (error) {
    logger.error('Failed to handle notification', { error: extractErrorMessage(error) });
  }
}

async function handleNotification(parsedPayload: NotificationPayload | null) {
  const hookEventName = parsedPayload?.hook_event_name;
  const message = parsedPayload?.message;
  const transcriptPath = parsedPayload?.transcript_path;
  const sessionId = parsedPayload?.session_id;

  logger.info('Processing notification', { transcriptPath, hookEventName, sessionId });

  // Extract project info
  const projectFolder = project.extractFolder(transcriptPath || '') || 'unknown';
  const displayName = project.getDisplayNameFromFolder(projectFolder);

  logger.info('Extracted project info', { projectFolder, displayName });

  // Log to history (full Claude payload stored in SQLite)
  const eventType = hookEventName === 'Stop' ? 'stop' : 'notification';
  history.log({
    type: eventType,
    project: displayName,
    session_id: sessionId,
    hook_event_name: hookEventName,
    message,
    payload: parsedPayload || undefined,  // Full Claude metadata as JSON
  });

  // Build and speak message
  const speechMessage = buildSpeechMessage(displayName, hookEventName, message);
  logger.info('Speaking', { speechMessage });

  await speak(speechMessage, { sessionId });

  // Track alert for reminders (only for notifications that need user attention)
  const alertConfig = config.getAlertConfig();
  const alertType = shouldAlert(hookEventName, message);

  if (sessionId && alertConfig.enabled && alertType) {
    // Check if there's already an active reminder for this session
    const existingAlert = alerts.get(sessionId);
    const hasActiveReminder = existingAlert?.reminderPid != null;

    // Set/update the pending alert
    alerts.set({
      sessionId,
      project: displayName,
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
    logger.info('Informational notification, no alert needed', { hookEventName, message });
  }

  // Print to console for hook feedback
  console.log(`🔊 ${speechMessage}`);
}

/**
 * Determine if this notification needs user attention (should create an alert).
 * Returns the alert type if yes, null if it's just informational.
 */
function shouldAlert(hookEventName?: string, message?: string): string | null {
  const msg = (message || '').toLowerCase();

  // Permission requests - user MUST respond
  if (msg.includes('permission') || hookEventName === 'PermissionRequest') {
    return 'permission';
  }

  // Waiting for input - user MUST respond
  if (msg.includes('waiting') || msg.includes('input')) {
    return 'input';
  }

  // Errors - user should see these
  if (msg.includes('error') || msg.includes('failed')) {
    return 'error';
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
function parseNotificationPayload(rawPayload: string): { payload: NotificationPayload | null; wasJson: boolean } {
  try {
    const jsonPayload = JSON.parse(rawPayload);

    if (typeof jsonPayload !== 'object' || jsonPayload === null) {
      return { payload: null, wasJson: true };
    }

    return { payload: jsonPayload as NotificationPayload, wasJson: true };
  } catch {
    return { payload: null, wasJson: false };
  }
}

function buildSpeechMessage(projectName: string, hookEventName?: string, message?: string): string {
  if (hookEventName === 'Stop') {
    return `In ${projectName}, Claude completed a task`;
  }

  const cleanMessage = (message ?? 'Notification received').replace(/Claude Code/g, 'Claude');
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
