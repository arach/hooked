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
echo '{"message": "Test message", "transcript_path": "/path/to/project"}' | npx tsx notification.ts hook-type

# Run test script
npx tsx test-notification.ts

# Check logs
tail -f ~/logs/claude-hooks/notification.log

# Watch logs in real-time
tail -f ~/logs/claude-hooks/notification.log | grep -E "(INFO|ERROR|WARN)"
```

## Dependencies

- **winston**: Structured logging with file and console transports
- **speakeasy**: Text-to-speech functionality with ElevenLabs integration
- **@types/winston**: TypeScript definitions for Winston

## Hook Integration & Execution

### Claude Code Hook System
The notification system integrates with Claude Code's global hook system:

**Global Hook Location**: `~/.claude/hooks/notification.ts`
- This is the actual hook that Claude Code executes
- Symlinked or copied from this project's `hooks/notification.ts`
- Automatically triggered by Claude Code events

**Local Development Version**: `./hooks/notification.ts`
- Development and testing version in this repository
- Should be kept in sync with the global hook

### Hook Execution Flow
1. Claude Code triggers hook with notification type and payload
2. Hook receives notification type as first CLI argument
3. JSON payload containing `message` and `transcript_path` is passed via stdin
4. Notification handler processes, logs, copies to clipboard, and speaks

### Testing the Hook System

**Test Local Version**:
```bash
# Test the local notification handler
cd hooks
npx tsx test-notification.ts

# Manual test with custom payload
echo '{"message": "Test message", "transcript_path": "/path/to/project"}' | npx tsx notification.ts test-hook
```

**Test Global Claude Code Hook**:
```bash
# Test the actual Claude Code hook
echo '{"message": "Testing Claude Code hook", "transcript_path": "/Users/arach/dev/hooked"}' | npx tsx ~/.claude/hooks/notification.ts claude-hook
```

**Verify Hook Integration**:
```bash
# Check if global hook exists
ls -la ~/.claude/hooks/notification.ts

# Compare local vs global versions
diff ./hooks/notification.ts ~/.claude/hooks/notification.ts
```

## Logging & Monitoring

### Log Locations
- **Main Log File**: `~/logs/claude-hooks/notification.log`
- **Log Directory**: `~/logs/claude-hooks/` (created automatically)
- **Local Project Logs**: `./logs/` (for webhook router and other services)

### Log Monitoring Commands
```bash
# Watch live notifications
tail -f ~/logs/claude-hooks/notification.log

# Filter by log level
tail -f ~/logs/claude-hooks/notification.log | grep -E "(INFO|ERROR|WARN)"

# Check recent notifications
tail -20 ~/logs/claude-hooks/notification.log

# Search for specific events
grep "claude-hook" ~/logs/claude-hooks/notification.log

# Monitor all logs in project
tail -f ./logs/*.log
```

### Log Structure
Each notification creates structured JSON logs with:
- Timestamp
- Notification type
- Payload details
- Processing steps (clipboard, speech, project extraction)
- Error messages (if any)

## Speech Message Processing

The notification system includes intelligent message processing for natural speech output:
- Extracts project names from transcript paths for contextual announcements
- Transforms technical messages into natural speech patterns
- Handles common Claude Code notification types with appropriate responses
- Uses ElevenLabs TTS via `speakeasy` library