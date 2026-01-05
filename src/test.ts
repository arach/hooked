#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import winston from 'winston';

// Types
interface NotificationPayload {
  hook_event_name?: string;
  message?: string;
  transcript_path?: string;
  [key: string]: unknown;
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

// Setup centralized logging with Winston
const logDir = join(homedir(), 'logs', 'claude-hooks');
const logFile = join(logDir, 'test-notification.log');

// Ensure log directory exists
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true });
}

// Create Winston logger with proper configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
      return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
    })
  ),
  transports: [
    // File transport for persistent logging
    new winston.transports.File({ 
      filename: logFile,
      level: 'info'
    }),
    // Console transport with colors for immediate feedback
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Read notification type from command line argument
const notificationType = process.argv[2];

logger.info('Test notification script started', { notificationType });

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

  const notificationData = {
    type: notificationType,
    timestamp: new Date().toISOString(),
    payload,
    parsedPayload: parsedPayloadResult.payload,
    wasJson: parsedPayloadResult.wasJson
  };

  try {
    copyToClipboard(JSON.stringify(notificationData, null, 2));
    logger.info('Copied notification JSON to clipboard', { type: notificationType });
  } catch (error) {
    logger.error('Failed to copy to clipboard', { error: extractErrorMessage(error) });
  }

  const hookEventName = parsedPayloadResult.payload?.hook_event_name;
  const message = parsedPayloadResult.payload?.message;
  const transcriptPath = parsedPayloadResult.payload?.transcript_path;

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

  console.log('\nWOULD SPEAK:', speechMessage);
  console.log('Project extracted:', projectName);
  console.log('Original path:', transcriptPath);
  console.log('Original message:', message ?? 'Notification received');

  logger.info('Test notification script completed');
}

function copyToClipboard(content: string) {
  execSync('pbcopy', { input: content });
}

// Handle process errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', { reason, promise });
  process.exit(1);
});
