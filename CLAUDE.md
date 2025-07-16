# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Node.js TypeScript project for handling Claude Code hooks and notifications. It creates a notification system that processes payloads from stdin, logs them, copies to clipboard, and provides text-to-speech feedback.

## Architecture

The project is structured with a main hooks directory containing:

- `notification.ts` - Main notification handler that processes Claude Code hook payloads
- `test-notification.ts` - Test script to validate the notification system

### Key Components

**Notification Handler (`notification.ts`)**
- Reads notification type from command line arguments
- Processes JSON payloads from stdin
- Structured logging with Winston to `~/logs/claude-hooks/notification.log`
- Clipboard integration using `pbcopy`
- Text-to-speech using `speakeasy` library with ElevenLabs provider
- Project name extraction from transcript paths for contextual speech messages
- Intelligent message processing for natural speech output

**Test System (`test-notification.ts`)**
- Simulates notification flow with test payloads
- Validates the notification pipeline end-to-end
- Uses realistic test data matching expected Claude Code hook payloads

## Common Development Commands

```bash
# Install dependencies (in hooks directory)
cd hooks && npm install

# Run notification handler (typically called by Claude Code hooks)
echo '{"message": "Test message", "transcript_path": "/path/to/project"}' | pnpx tsx notification.ts hook-type

# Run test script
pnpx tsx test-notification.ts

# Check logs
tail -f ~/logs/claude-hooks/notification.log

# Watch logs in real-time
tail -f ~/logs/claude-hooks/notification.log | grep -E "(INFO|ERROR|WARN)"
```

## Dependencies

- **winston**: Structured logging with file and console transports
- **speakeasy**: Text-to-speech functionality with ElevenLabs integration
- **@types/winston**: TypeScript definitions for Winston

## Hook Integration

This project is designed to integrate with Claude Code's hook system. The notification handler expects:
- Notification type as first command line argument
- JSON payload via stdin containing `message` and `transcript_path` fields
- Processes Claude Code events like permission requests and status updates

### Speech Message Processing

The notification system includes intelligent message processing for natural speech output:
- Extracts project names from transcript paths for contextual announcements
- Transforms technical messages into natural speech patterns
- Handles common Claude Code notification types with appropriate responses