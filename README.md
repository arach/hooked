# 🎯 Hooked

A simple notification handler for Claude Code hooks.

## ✨ Features

- **🔊 Intelligent Speech Synthesis** - Converts technical notifications into natural speech using ElevenLabs
- **📋 Clipboard Integration** - Automatically copies notification data to clipboard for easy access
- **📝 Structured Logging** - Comprehensive logging with Winston to track all notifications
- **🎨 Context-Aware Messages** - Extracts project names from paths for personalized notifications
- **🔗 Seamless Integration** - Designed specifically for Claude Code's hook system

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh) runtime
- [speakeasy](https://github.com/arach/speakeasy) library for text-to-speech
- ElevenLabs API access (for premium speech synthesis)

### Installation

```bash
# Clone the repository
git clone git@github.com:arach/hooked.git
cd hooked

# Install dependencies
bun install

# Deploy to Claude Code hooks
bun run deploy
```

### Usage

The notification handler is typically called by Claude Code hooks, but can be tested manually:

```bash
# Basic usage
echo '{"message": "Claude needs your permission", "transcript_path": "/path/to/project"}' | bun src/notification.ts permission-request

# Run the test suite
bun test

# Monitor logs in real-time
tail -f ~/logs/claude-hooks/notification.log
```

## 🏗️ Architecture

### Core Components

```
hooked/
├── src/
│   ├── notification.ts  # Main notification handler
│   └── test.ts          # Test and validation system
├── deploy.ts            # Deployment script
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── .env.example         # Environment variables template
```

### Notification Flow

1. **Input Processing** - Reads notification type from CLI args and JSON payload from stdin
2. **Data Structuring** - Parses and organizes notification data with timestamps
3. **Project Context** - Extracts project names from transcript paths for context
4. **Multi-Channel Output**:
   - 🔊 **Speech**: Natural language TTS via ElevenLabs
   - 📋 **Clipboard**: Formatted JSON for easy access
   - 📝 **Logs**: Structured logging to `~/logs/claude-hooks/notification.log`

### Message Intelligence

The system includes smart message processing:

- **Project Context**: Extracts project names from file paths
- **Natural Language**: Converts technical messages to conversational speech
- **Contextual Responses**: Tailors speech based on notification type
- **Error Handling**: Graceful fallbacks for parsing and processing errors

## 📋 Claude Code Hook Coverage

Hooked currently implements handlers for a subset of Claude Code's hook events. Below is the full list of available hooks and implementation status:

### Implemented ✅

| Hook Event | Status | Description |
|-----------|--------|-------------|
| **Notification** | ✅ **Fully Supported** | Processes all notification types with speech, clipboard, and logging |
| **Stop** | ⚠️ **Partial** | Uses same handler as Notification |

### Available But Not Yet Implemented

| Hook Event | Use Case | Priority |
|-----------|----------|----------|
| **PreToolUse** | Validate/modify tool calls before execution | High |
| **PostToolUse** | React to tool completions, log tool usage | High |
| **UserPromptSubmit** | Add context or validate user prompts | Medium |
| **SubagentStop** | Handle subagent completion | Medium |
| **SessionStart** | Load context at session start | Medium |
| **PreCompact** | React before context compaction | Low |
| **SessionEnd** | Cleanup or logging at session end | Low |

### Roadmap

**Next Steps:**
1. Refactor handler to support multiple hook types
2. Add PreToolUse support for permission automation
3. Add PostToolUse for comprehensive tool logging
4. Add SessionStart for environment setup notifications

**Contributing:**
Contributions welcome! If you'd like to add support for additional hook types, see the [Claude Code Hooks Documentation](https://code.claude.com/docs/en/hooks.md) for payload schemas and behavior.

## 🎛️ Configuration

### Automatic Configuration

**No manual configuration required!** The deploy script automatically:

- ✅ Detects your home directory (uses Node.js `homedir()`)
- ✅ Finds `~/.claude/hooks/` directory (creates if needed)
- ✅ Locates `~/.claude/settings.json` (creates if needed)
- ✅ Works on macOS, Linux, and Windows

Simply run `npx tsx deploy.ts` and everything is configured automatically.

### Environment Variables

The system uses default configurations but can be customized:

- Log directory: `~/logs/claude-hooks/`
- Speech provider: ElevenLabs (configurable in `notification.ts`)
- Log level: `info` (configurable in Winston setup)

### Claude Code Integration

The deployment script automatically configures Claude Code hooks in your `~/.claude/settings.json`. It safely preserves any existing hooks and settings while adding the notification system.

**Safe Settings Handling:**
- ✅ Preserves existing hooks and settings
- ✅ Only updates the `Notification` hook configuration
- ✅ Checks if configuration is already up-to-date before writing
- ✅ Creates backup-friendly JSON formatting

**Manual Configuration (if needed):**
```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "HOOKED_LOG_FILE=true bun ~/.claude/hooks/notification.ts"
          }
        ]
      }
    ]
  }
}
```

## 🧪 Testing

### Manual Testing

```bash
# Test with sample data
bun test

# Test specific notification types
echo '{"message": "Build completed", "transcript_path": "/Users/dev/my-project"}' | bun src/notification.ts build-complete
```

### Log Analysis

```bash
# View recent notifications
tail -20 ~/logs/claude-hooks/notification.log

# Filter by log level
tail -f ~/logs/claude-hooks/notification.log | grep -E "(INFO|ERROR|WARN)"

# Search for specific project notifications
grep "my-project" ~/logs/claude-hooks/notification.log
```

## 🔧 Development

### Project Structure

- **TypeScript**: Modern ES modules with type safety
- **Winston**: Structured logging with file and console transports
- **Speakeasy**: Text-to-speech with ElevenLabs integration
- **Node.js**: Cross-platform compatibility

### Common Development Tasks

```bash
# Install dependencies
bun install

# Run in development mode
bun src/notification.ts test-message

# Monitor logs during development
tail -f ~/logs/claude-hooks/notification.log

# Test notification pipeline
bun test
```

## 📊 Logging

All notifications are logged to `~/logs/claude-hooks/notification.log` with structured data:

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "INFO",
  "message": "Notification processed successfully",
  "type": "permission-request",
  "project": "my-awesome-project",
  "speechMessage": "In my awesome project, Claude needs your permission"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m '✨ Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the package.json file for details.

## 🔗 Related

- [Claude Code Hooks Documentation](https://code.claude.com/docs/en/hooks.md)
- [SpeakEasy](https://github.com/arach/speakeasy) - Unified text-to-speech library powering the speech functionality
- [ElevenLabs API](https://elevenlabs.io/)
- [Winston Logging](https://github.com/winstonjs/winston)

---

*Built with ❤️ for enhanced Claude Code workflows*