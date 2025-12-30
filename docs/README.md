# Hooked Documentation

A hooks helper for Claude Code. Voice alerts when Claude needs you, continuation hooks that keep it working until done.

## Table of Contents

- [Introduction](#introduction)
- [Session-Scoped Continuation](#session-scoped-continuation) **NEW**
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Voice Alerts (SpeakEasy)](#voice-alerts-speakeasy)
- [Continuation Presets](#continuation-presets)
- [CLI Reference](#cli-reference)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

---

## Introduction

**Hooked** solves two problems with Claude Code:

1. **Missed prompts** — You're in another app, Claude needs permission, you don't notice for 10 minutes
2. **Premature stops** — Claude says "done" but tests are failing, build is broken, work isn't actually complete

Hooked adds:
- **Voice alerts** via SpeakEasy when Claude needs your attention
- **Continuation hooks** that keep Claude working until your checks pass

### How It Works

Hooked installs [Claude Code hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) that intercept events:

- **Notification hooks** — Trigger voice alerts on permission requests, errors, or when Claude is waiting
- **Stop hooks** — Run your checks (tests, build, typecheck) when Claude tries to stop. If checks fail, Claude keeps working.

### Requirements

- [Claude Code](https://claude.ai/code) installed and configured
- Node.js 18+
- macOS or Linux
- (Optional) [SpeakEasy](https://github.com/arach/speakeasy) for voice alerts

---

## Session-Scoped Continuation

> **The killer feature.** Run different continuation objectives in different Claude sessions without them interfering with each other.

### The Problem

You're working on a complex project with multiple Claude Code sessions open:

- **Terminal 1**: Claude is documenting your codebase
- **Terminal 2**: Claude is fixing a bug
- **Terminal 3**: Claude is writing tests

With global continuation, if you run `hooked manual "Document the codebase"`, **all three sessions** get that objective. The bug-fixing Claude starts trying to document. The test-writing Claude gets confused. Everything breaks.

You need continuation to be **session-specific** — each Claude instance should have its own objective.

### The Challenge

Claude Code's hook system passes `session_id` to hooks when they fire. But there's no API to query "what's my current session ID?" from the terminal or from within Claude.

So when you run `hooked manual "Document codebase"`, you can't say "activate for session X" because you don't know X yet.

### The Solution: Lazy Binding

Hooked uses a "pending activation" pattern:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Terminal       │     │  ~/.hooked/      │     │  Claude Session     │
│                 │     │                  │     │                     │
│  hooked bind    │────>│  pending.json    │     │                     │
│  manual "docs"  │     │  {preset,obj}    │     │                     │
│                 │     │                  │     │                     │
└─────────────────┘     └──────────────────┘     └─────────────────────┘
                                                          │
                                                          │ Claude tries to stop
                                                          │ (triggers stop hook)
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│                 │     │  state/          │     │  Stop Hook          │
│                 │     │  {session_id}    │<────│                     │
│                 │     │  .json           │     │  Claims pending,    │
│                 │     │                  │     │  binds to session   │
└─────────────────┘     └──────────────────┘     └─────────────────────┘
```

1. **You run** `hooked bind manual "Document the codebase"`
2. **Hooked writes** `~/.hooked/pending.json` with your preset and objective
3. **Claude does something** that triggers a hook (notification or stop)
4. **Hook receives** `session_id` from Claude Code's context
5. **Hook claims** the pending activation, writing to `~/.hooked/state/{session_id}.json`
6. **Pending is cleared** — other sessions won't see it
7. **Future stop hooks** for that session read from its own state file

### Usage

```bash
# Session-scoped (recommended)
hooked bind manual "Document the codebase"
hooked bind test                    # Keep working until tests pass
hooked bind build "Fix the build"   # With custom objective

# Check status
hooked status
# Output:
#   Pending: manual (waiting for session)
#   Objective: Document the codebase

# Disable
hooked off                          # Clears pending or current session
```

### The Outcome

After binding, you'll see session-specific state files:

```
~/.hooked/state/
├── bfe239db-369f-4423-8a90-43bfe6a17955.json   # Session 1: documenting
├── a1b2c3d4-5678-90ab-cdef-1234567890ab.json   # Session 2: fixing bugs
└── 98765432-abcd-ef01-2345-6789abcdef01.json   # Session 3: writing tests
```

Each file contains:
```json
{
  "sessionId": "bfe239db-369f-4423-8a90-43bfe6a17955",
  "iteration": 3,
  "startedAt": "2024-01-15T10:30:00.000Z",
  "lastUpdatedAt": "2024-01-15T10:35:00.000Z",
  "project": "my-project",
  "activePreset": "manual",
  "objective": "Document the codebase"
}
```

**Each session has its own continuation state.** They don't interfere. When one session completes its objective, only its state is cleared.

### Global Mode (Legacy)

If you want the old behavior where a preset applies to ALL sessions:

```bash
hooked continue test    # Global - affects all Claude sessions
hooked continue off     # Disable global
```

This is useful for simple cases where you only have one Claude session active.

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/arach/hooked.git
cd hooked
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Run the setup script

```bash
pnpm run hooked:init
```

This will:
- Create the `~/.hooked/` directory structure
- Install hooks to `~/.claude/hooks/`
- Configure Claude Code's `settings.json` with hook definitions

### 4. (Optional) Set up SpeakEasy for voice alerts

```bash
npm install -g @arach/speakeasy
speakeasy config
```

Follow the prompts to configure your TTS provider (ElevenLabs recommended).

---

## Quick Start

### Enable a continuation preset

```bash
# Keep Claude working until tests pass
hooked test

# Check current status
hooked status
```

### What happens next

1. You give Claude a task
2. Claude works on it
3. When Claude tries to stop, the hook runs `pnpm test`
4. If tests fail → Claude gets a prompt to keep working
5. If tests pass → Claude stops (actually done)
6. Preset auto-disables after success

### Disable when done

```bash
hooked off
```

---

## Voice Alerts (SpeakEasy)

Voice alerts notify you audibly when Claude needs attention. No more missed permission prompts.

### What triggers alerts

| Event | Voice Message |
|-------|---------------|
| Permission request | "In {project}, Claude needs your permission" |
| Waiting for input | "In {project}, Claude is waiting for you" |
| Error occurred | "In {project}, Claude encountered an error" |

### Configuration

Voice alerts are enabled by default. To disable:

```bash
# Edit ~/.hooked/config.json
{
  "flags": {
    "speak": false
  }
}
```

### Customizing messages

Messages are defined in `~/.hooked/src/notification.ts`. The `{project}` placeholder is automatically replaced with the current project name (extracted from the transcript path).

### SpeakEasy setup

1. Install SpeakEasy globally:
   ```bash
   npm install -g @arach/speakeasy
   ```

2. Configure your TTS provider:
   ```bash
   speakeasy config
   ```

3. Test it works:
   ```bash
   speakeasy say "Hello from hooked"
   ```

Supported providers: ElevenLabs, OpenAI TTS, Azure, Google Cloud TTS, and more.

---

## Continuation Presets

Presets define what "done" means. Instead of Claude stopping when it feels done, it stops when your checks pass.

### Available presets

| Preset | Command | Check | Description |
|--------|---------|-------|-------------|
| `test` | `hooked test` | `pnpm test` | Keep working until tests pass |
| `build` | `hooked build` | `pnpm build` | Keep working until build succeeds |
| `typecheck` | `hooked typecheck` | `pnpm typecheck` | Keep working until types are clean |
| `lint` | `hooked lint` | `pnpm lint` | Keep working until lint passes |
| `manual` | `hooked manual` | (none) | Keep working until you say stop |

### How presets work

When a preset is active:

1. Claude attempts to stop (sends a stop signal)
2. The stop hook intercepts this
3. Hook runs the preset's check command
4. **If check fails**: Hook returns `{ "decision": "block" }` with a continuation prompt
5. **If check passes**: Hook returns `{ "decision": "approve" }` and auto-disables the preset
6. Claude either continues working or stops

### Custom check commands

You can specify a custom command:

```bash
hooked test "npm run test:unit"
hooked build "make build"
```

### Continuation prompts

When checks fail, Claude receives a prompt telling it what to do:

| Preset | Continuation Prompt |
|--------|---------------------|
| test | "Tests failed. Read the errors, fix the code, and run tests again." |
| build | "Build failed. Fix the errors and rebuild." |
| typecheck | "Type errors found. Fix them and run typecheck again." |
| manual | "Keep going. Do not stop until I tell you to." |

### Safety limits

To prevent infinite loops, there's a maximum iteration count (default: 30). After 30 failed attempts, the hook allows Claude to stop regardless of check status.

---

## CLI Reference

### `hooked <preset> [command]`

Enable a continuation preset.

```bash
hooked test              # Use default: pnpm test
hooked test "npm test"   # Use custom command
hooked build             # Use default: pnpm build
hooked manual            # No check, just keep going
```

### `hooked off`

Disable the active preset. Claude will stop normally.

```bash
hooked off
```

### `hooked status`

Show current configuration and active preset.

```bash
hooked status
# Output:
# Active preset: test
# Check command: pnpm test
# Voice alerts: enabled
# Iterations this session: 3
```

### `hooked config`

Open the configuration file in your default editor.

```bash
hooked config
```

### `hooked logs`

Tail the hook logs in real-time.

```bash
hooked logs
# Equivalent to: tail -f ~/logs/claude-hooks/notification.log
```

---

## Configuration

Configuration is stored in `~/.hooked/config.json`:

```json
{
  "activePreset": "test",
  "customCommand": null,
  "flags": {
    "speak": true,
    "logging": true
  },
  "limits": {
    "maxIterations": 30
  }
}
```

### Options

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `activePreset` | string \| null | `null` | Currently active preset (test, build, typecheck, lint, manual) |
| `customCommand` | string \| null | `null` | Custom check command (overrides preset default) |
| `flags.speak` | boolean | `true` | Enable voice alerts |
| `flags.logging` | boolean | `true` | Enable file logging |
| `limits.maxIterations` | number | `30` | Maximum continuation attempts before force-stop |

### File locations

```
~/.hooked/
├── config.json      # Configuration
├── state/           # Session state (iterations, etc.)
├── history/         # Event logs
└── src/             # Hook source files

~/.claude/
├── hooks/           # Deployed hook scripts
└── settings.json    # Claude Code hook configuration
```

---

## API Reference

For advanced users who want to build custom stop hooks.

### Creating a stop hook

```typescript
import { createStopHook, maxIterations, continueUntil } from 'hooked/stop'

const hook = createStopHook([
  maxIterations(30),    // Safety limit
  continueUntil(),      // Preset-based continuation
])

hook()
```

### Built-in evaluators

```typescript
import {
  maxIterations,     // Stop after N iterations
  continueUntil,     // Preset-based (hooked test/build/etc)
  commandSucceeds,   // Custom command check
  testsPass,         // Alias for commandSucceeds('pnpm test')
  buildSucceeds,     // Alias for commandSucceeds('pnpm build')
} from 'hooked/stop'
```

### Evaluator interface

```typescript
interface StopEvaluator {
  name: string
  evaluate: (context: StopContext) => Promise<EvaluatorResult>
}

interface StopContext {
  sessionId: string
  transcriptPath: string
  iteration: number
}

interface EvaluatorResult {
  decision: 'approve' | 'block' | 'continue'
  reason?: string
  prompt?: string  // Continuation prompt for Claude
}
```

### Custom evaluator example

```typescript
import { createStopHook } from 'hooked/stop'

const customEvaluator = {
  name: 'coverage-check',
  evaluate: async (context) => {
    const result = await runCommand('pnpm test:coverage')
    const coverage = parseCoverage(result)

    if (coverage < 80) {
      return {
        decision: 'block',
        reason: `Coverage is ${coverage}%, need 80%`,
        prompt: `Test coverage is ${coverage}%. Add more tests to reach 80% coverage.`
      }
    }

    return { decision: 'approve' }
  }
}

const hook = createStopHook([
  maxIterations(20),
  customEvaluator,
])
```

---

## Troubleshooting

### Voice alerts not working

1. **Check SpeakEasy is installed:**
   ```bash
   speakeasy --version
   ```

2. **Test SpeakEasy directly:**
   ```bash
   speakeasy say "Test message"
   ```

3. **Check speak flag is enabled:**
   ```bash
   cat ~/.hooked/config.json | grep speak
   ```

4. **Check logs for errors:**
   ```bash
   tail -f ~/logs/claude-hooks/notification.log
   ```

### Continuation hooks not triggering

1. **Check a preset is active:**
   ```bash
   hooked status
   ```

2. **Verify hooks are installed:**
   ```bash
   ls ~/.claude/hooks/
   cat ~/.claude/settings.json | grep hooks
   ```

3. **Re-run setup:**
   ```bash
   pnpm run hooked:init
   ```

### Claude keeps working forever

1. **Check iteration count:**
   ```bash
   hooked status
   ```

2. **Force disable:**
   ```bash
   hooked off
   ```

3. **Check if tests are actually failing:**
   ```bash
   pnpm test
   ```

### Hook errors in Claude Code

1. **Check hook logs:**
   ```bash
   hooked logs
   ```

2. **Test hook manually:**
   ```bash
   echo '{"session_id":"test","transcript_path":"/test"}' | npx tsx ~/.hooked/src/stop/default-hook.ts
   ```

---

## FAQ

### Is hooked safe to use?

Yes. Hooked only adds hooks that:
- Read events (notifications)
- Run your own commands (tests, build)
- Return continue/stop decisions

It doesn't modify Claude's behavior beyond what hooks are designed for. The safety limit prevents infinite loops.

### Does it work with other package managers?

Yes. You can specify any command:

```bash
hooked test "npm test"
hooked test "yarn test"
hooked test "make test"
```

### Can I use multiple presets at once?

No, only one preset can be active at a time. The last one you enable wins.

### What happens if my tests hang?

The check command has a timeout (default: 60 seconds). If it hangs, it's treated as a failure and Claude continues working.

### Does it work with remote/SSH sessions?

Voice alerts require a local audio output. Continuation hooks work anywhere Claude Code runs.

### Can I customize the voice?

Yes, through SpeakEasy. Run `speakeasy config` to choose different voices, providers, and settings.

### How do I uninstall?

```bash
# Remove hooks from Claude Code
rm -rf ~/.claude/hooks/hooked*

# Remove hooked config
rm -rf ~/.hooked

# Remove the repo
rm -rf /path/to/hooked
```

---

## Resources

- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code)
- [Claude Code Hooks Reference](https://docs.anthropic.com/en/docs/claude-code/hooks)
- [SpeakEasy TTS Library](https://github.com/arach/speakeasy)
- [Hooked GitHub Repository](https://github.com/arach/hooked)

---

**Default: OFF** — Continuation only activates when you explicitly enable a preset. Voice alerts are always on (if SpeakEasy is configured).
