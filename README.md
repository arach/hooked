# 🎯 Hooked

A simple, focused notification handler for Claude Code hooks.

## ✨ Features

- **🔊 Speech Notifications** - Converts Claude Code notifications into natural speech using ElevenLabs
- **📝 Structured Logging** - Tracks all notifications with Winston to `~/logs/claude-hooks/notification.log`
- **🎨 Smart Context** - Extracts project names from paths for personalized messages
- **⚡️ Zero Config** - Automated deployment and setup

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh) - Fast JavaScript runtime
- [SpeakEasy](https://github.com/arach/speakeasy) - Configured with TTS provider (ElevenLabs recommended)

### Installation

```bash
# Clone and install
git clone git@github.com:arach/hooked.git
cd hooked
bun install

# Deploy to Claude Code
bun run deploy
```

That's it! The deployment script automatically:
- Copies files to `~/.claude/hooks/`
- Installs dependencies
- Configures your `~/.claude/settings.json`
- Sets up logging

### Usage

The notification handler runs automatically when Claude Code triggers hook events. Test it manually:

```bash
# Run test suite
bun test

# Test specific notification
echo '{"message": "Test message", "transcript_path": "/path/to/project"}' | bun src/notification.ts test

# Monitor logs
tail -f ~/logs/claude-hooks/notification.log
```

## 🏗️ Project Structure

```
hooked/
├── src/
│   ├── notification.ts      # Main hook handler
│   └── test.ts              # Test suite
├── deploy.ts                # One-command deployment
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config (strict mode)
└── .env.example             # Environment variables
```

**Simple and focused** - Just the essentials for Claude Code hook notifications.

## 🔧 Configuration

### Environment Variables

Create a `.env` file (optional - defaults work out of the box):

```bash
# Enable file logging (enabled by default during deployment)
HOOKED_LOG_FILE=true
```

### SpeakEasy Setup

Configure SpeakEasy with your TTS provider and API keys. See the [SpeakEasy documentation](https://github.com/arach/speakeasy) for setup instructions.

### Manual Hook Configuration

The deploy script handles this automatically, but if needed:

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

## 🎯 How It Works

### Notification Flow

1. **Claude Code triggers hook** → Sends JSON payload via stdin
2. **Parse & extract context** → Reads notification type, message, and project path
3. **Multi-channel output**:
   - 🔊 **Speak** - "In hooked, Claude needs your permission"
   - 📝 **Log** - Structured JSON to `~/logs/claude-hooks/notification.log`
   - 🧠 **Process** - Natural language transformation for TTS

### Message Intelligence

The system transforms technical notifications into conversational speech:

```javascript
// Input
{ "message": "Claude Code is waiting for your input", "transcript_path": ".../-hooked/..." }

// Output
🔊 "In hooked, Claude is waiting for you"
```

## 📋 Supported Hooks

| Hook Event | Status | Description |
|-----------|--------|-------------|
| **Notification** | ✅ Fully Supported | All Claude Code notification types |
| **Stop** | ✅ Supported | Task completion notifications |

### Future Hooks (Roadmap)

- **PreToolUse** - Validate tool calls before execution
- **PostToolUse** - Log tool usage and results
- **UserPromptSubmit** - Add context to prompts
- **SessionStart** - Setup notifications

Want to contribute? Check the [Claude Code Hooks Documentation](https://code.claude.com/docs/en/hooks.md) for payload schemas.

## 🧪 Testing

```bash
# Run the test suite
bun test

# Test with custom payload
echo '{"message": "Build completed", "transcript_path": "/Users/dev/my-project"}' | bun src/notification.ts build-complete

# Check logs
tail -20 ~/logs/claude-hooks/notification.log

# Filter by level
tail -f ~/logs/claude-hooks/notification.log | grep ERROR
```

## 🛠️ Development

```bash
# Install dependencies
bun install

# Run notification handler directly
bun src/notification.ts test-message

# Watch logs
tail -f ~/logs/claude-hooks/notification.log

# Run tests
bun test
```

### Tech Stack

- **Runtime**: Bun (fast, modern JavaScript runtime)
- **Language**: TypeScript with strict mode enabled
- **Logging**: Winston with file rotation and structured JSON
- **TTS**: SpeakEasy library with ElevenLabs provider
- **Deployment**: Automated script with safe settings merging

## 📊 Log Format

All notifications are logged with structured data:

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "INFO",
  "message": "Notification script started",
  "notificationType": "permission-request",
  "projectName": "my-project",
  "speechMessage": "In my project, Claude needs your permission"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit with gitmoji (`git commit -m '✨ Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

ISC License - See package.json for details.

## 🔗 Resources

- [Claude Code Documentation](https://code.claude.com/)
- [Claude Code Hooks Guide](https://code.claude.com/docs/en/hooks.md)
- [SpeakEasy Library](https://github.com/arach/speakeasy)
- [Bun Runtime](https://bun.sh)
- [Winston Logging](https://github.com/winstonjs/winston)

---

**Built with ❤️ for enhanced Claude Code workflows**
