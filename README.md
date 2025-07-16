# 🎯 Hooked

A sophisticated notification system for Claude Code hooks that transforms technical notifications into intelligent, contextual alerts with logging, clipboard integration, and natural text-to-speech feedback.

## ✨ Features

- **🔊 Intelligent Speech Synthesis** - Converts technical notifications into natural speech using ElevenLabs
- **📋 Clipboard Integration** - Automatically copies notification data to clipboard for easy access
- **📝 Structured Logging** - Comprehensive logging with Winston to track all notifications
- **🎨 Context-Aware Messages** - Extracts project names from paths for personalized notifications
- **🔗 Seamless Integration** - Designed specifically for Claude Code's hook system

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or pnpm
- [speakeasy](https://github.com/speakeasy-js/speakeasy) library for text-to-speech
- ElevenLabs API access (for premium speech synthesis)

### Installation

```bash
# Clone the repository
git clone git@github.com:arach/hooked.git
cd hooked

# Deploy to Claude Code hooks
npx tsx deploy.ts
```

### Usage

The notification handler is typically called by Claude Code hooks, but can be tested manually:

```bash
# Basic usage
echo '{"message": "Claude needs your permission", "transcript_path": "/path/to/project"}' | npx tsx notification.ts permission-request

# Run the test suite
npx tsx test-notification.ts

# Monitor logs in real-time
tail -f ~/logs/claude-hooks/notification.log
```

## 🏗️ Architecture

### Core Components

```
hooks/
├── notification.ts      # Main notification handler
├── test-notification.ts # Test and validation system
├── package.json        # Dependencies and scripts
└── .gitignore         # Git ignore rules
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

## 🎛️ Configuration

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
            "command": "npx tsx ~/.claude/hooks/notification.ts"
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
npx tsx test-notification.ts

# Test specific notification types
echo '{"message": "Build completed", "transcript_path": "/Users/dev/my-project"}' | npx tsx notification.ts build-complete
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
cd hooks && npm install

# Run in development mode
npx tsx notification.ts test-message

# Monitor logs during development
tail -f ~/logs/claude-hooks/notification.log

# Test notification pipeline
npx tsx test-notification.ts
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

- [Claude Code Documentation](https://docs.anthropic.com/claude/docs)
- [ElevenLabs API](https://elevenlabs.io/)
- [Winston Logging](https://github.com/winstonjs/winston)
- [Speakeasy TTS](https://github.com/speakeasy-js/speakeasy)

---

*Built with ❤️ for enhanced Claude Code workflows*