#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import winston from 'winston';

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

// Read payload from stdin
let payload = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  payload += chunk;
});

process.stdin.on('end', async () => {
  logger.info('Received payload from stdin', { payloadLength: payload.length });

  // Create a structured object with all the notification data
  const notificationData = {
    type: notificationType,
    timestamp: new Date().toISOString(),
    payload: payload,
    // Try to parse as JSON if possible
    parsedPayload: (() => {
      try {
        return JSON.parse(payload);
      } catch {
        return payload;
      }
    })()
  };

  logger.info('Created notification data object', { 
    type: notificationData.type,
    hasParsedPayload: !!notificationData.parsedPayload
  });

  // Pretty print the JSON
  const formattedJson = JSON.stringify(notificationData, null, 2);

  // Copy to clipboard using pbcopy
  try {
    execSync('pbcopy', { input: formattedJson });
    logger.info('Copied notification JSON to clipboard', { type: notificationType });
  } catch (error) {
    logger.error('Failed to copy to clipboard', { error: error.message });
  }

  // Extract message and project context from parsed payload
  const message = notificationData.parsedPayload?.message || 'Notification received';
  const transcriptPath = notificationData.parsedPayload?.transcript_path || '';
  
  let projectName = 'unknown project';
  logger.info('Processing transcript path', { transcriptPath, projectName });
  
  if (transcriptPath) {
    // Updated regex to handle project names with dots
    // First try to match projects/directory-name/ format (for dash-separated names)
    let pathMatch = transcriptPath.match(/projects\/[^\/]*-([^\/]+)\//);
    if (pathMatch) {
      projectName = pathMatch[1].replace(/-/g, ' ');
    } else {
      // If no dash format, try to match the full project directory name
      pathMatch = transcriptPath.match(/projects\/([^\/]+)\//);
      if (pathMatch) {
        // Handle both dash-separated and dot-separated names
        projectName = pathMatch[1].replace(/-/g, ' ').replace(/\./g, ' dot ');
      }
    }
    logger.info('Extracted project name from path', { projectName, originalPath: transcriptPath });
  }
  
  // Create a more natural speech message with context
  let speechMessage = '';
  
  // Add project context first
  const projectIntro = `In ${projectName}, `;
  
  // Customize messages for better speech
  if (message.includes('waiting for your input')) {
    speechMessage = `${projectIntro}Claude is waiting for you`;
  } else if (message.includes('permission')) {
    speechMessage = `${projectIntro}Claude needs your permission`;
  } else if (message.includes('request')) {
    speechMessage = `${projectIntro}Claude has a request for you`;
  } else {
    // For other messages, read them more naturally
    const cleanMessage = message
      .replace(/Claude Code/g, 'Claude')
      .replace(/\b(is|are|has|have)\b/g, '')  // Remove some filler words
      .trim();
    speechMessage = `${projectIntro}${cleanMessage}`;
  }
  
  logger.info('Prepared speech message', { 
    originalMessage: message, 
    speechMessage, 
    projectName 
  });
  
  // Instead of speaking, just log what would be spoken
  console.log('\n🎤 WOULD SPEAK:', speechMessage);
  console.log('📁 Project extracted:', projectName);
  console.log('📄 Original path:', transcriptPath);
  console.log('💬 Original message:', message);
});

// Handle process errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', { reason, promise });
  process.exit(1);
});

logger.info('Test notification script completed'); 