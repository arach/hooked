#!/usr/bin/env node

import { homedir } from 'os';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import winston from 'winston';
import { SpeakEasy } from '@arach/speakeasy';

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
  [key: string]: unknown;
}

const enableFileLogging = process.env.HOOKED_LOG_FILE === 'true';
const logger: Logger = enableFileLogging ? createLogger() : createNoOpLogger();

// Create SpeakEasy instance
// Configuration is managed by SpeakEasy via ~/.config/speakeasy/settings.json
// Run `speakeasy config` to set up providers and API keys
const speakEasy = new SpeakEasy({});
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
    await speakNotification(parsedPayloadResult.payload);
  } catch (error) {
    logger.error('Failed to speak notification', { error: extractErrorMessage(error) });
  }
}

async function speakNotification(parsedPayload: NotificationPayload | null) {
  const hookEventName = parsedPayload?.hook_event_name;
  const message = parsedPayload?.message;
  const transcriptPath = parsedPayload?.transcript_path;

  logger.info('Processing transcript path', { transcriptPath, hookEventName });

  const projectName = deriveProjectName(transcriptPath);
  if (transcriptPath) {
    logger.info('Extracted project name from path', { projectName, originalPath: transcriptPath });
  }

  const speechMessage = buildSpeechMessage(projectName, hookEventName, message);
  logger.info('Prepared speech message', {
    originalMessage: message,
    speechMessage,
    projectName
  });

  await speakEasy.speak(speechMessage, {
    priority: 'high'
  });

  logger.info(`SpeakEasy spoke: "${speechMessage}"`);

  // Print to console for hook feedback
  console.log(`🔊 ${speechMessage}`);
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

function deriveProjectName(transcriptPath?: string): string {
  if (!transcriptPath) {
    return 'unknown project';
  }

  const dashedMatch = transcriptPath.match(/projects\/[^/]*-([^/]+)\//);
  if (dashedMatch?.[1]) {
    return dashedMatch[1].replace(/-/g, ' ');
  }

  const plainMatch = transcriptPath.match(/projects\/([^/]+)\//);
  if (plainMatch?.[1]) {
    return plainMatch[1].replace(/-/g, ' ').replace(/\./g, ' dot ');
  }

  return 'unknown project';
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
