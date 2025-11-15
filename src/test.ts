#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import winston from 'winston';
import {
  buildSpeechMessage,
  deriveProjectName,
  extractErrorMessage,
  parseNotificationPayload,
  readStdin
} from './notification-utils';

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

  console.log('\n🎤 WOULD SPEAK:', speechMessage);
  console.log('📁 Project extracted:', projectName);
  console.log('📄 Original path:', transcriptPath);
  console.log('💬 Original message:', message ?? 'Notification received');

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
