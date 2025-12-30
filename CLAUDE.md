# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A TypeScript toolkit for Claude Code hooks. Voice notifications via SpeakEasy and smart continuation presets that keep Claude working until tests pass, build succeeds, or you say stop.

## Architecture

```
src/
├── cli/
│   ├── index.ts       # Main CLI entry (init wizard + command dispatch)
│   └── commands.ts    # Runtime commands (continue, status, presets)
├── core/
│   ├── config.ts      # Config management (~/.hooked/config.json)
│   ├── presets.ts     # Preset definitions (test, build, manual, etc.)
│   ├── state.ts       # Session state management
│   ├── log.ts         # Winston logging
│   └── continuation.ts # Legacy continuation (kept for compatibility)
├── stop/
│   ├── handler.ts     # createStopHook factory
│   ├── default-hook.ts # Default deployed hook
│   ├── types.ts       # TypeScript types
│   └── evaluators/    # Evaluator functions
│       ├── iterations.ts   # maxIterations()
│       ├── command.ts      # commandSucceeds(), testsPass(), etc.
│       └── continuation.ts # continueUntil() - preset-based
├── notification.ts    # Notification hook handler
└── index.ts           # Main exports
```

## Common Development Commands

```bash
# CLI commands
npx tsx src/cli/commands.ts status      # Show current state
npx tsx src/cli/commands.ts test        # Enable test preset
npx tsx src/cli/commands.ts build       # Enable build preset
npx tsx src/cli/commands.ts manual      # Enable manual preset
npx tsx src/cli/commands.ts off         # Disable continuation

# Test stop hook
echo '{"session_id":"test","transcript_path":"/test"}' | npx tsx src/stop/default-hook.ts

# Run init wizard
pnpm run hooked:init

# Watch logs
tail -f ~/logs/claude-hooks/notification.log
```

## Continuation Presets

The continuation system uses presets stored in `~/.hooked/config.json`:

```json
{
  "activePreset": "test",
  "flags": {
    "speak": true,
    "logging": true
  }
}
```

### Available Presets

| Preset | Check | Description |
|--------|-------|-------------|
| `test` | `pnpm test` | Keep working until tests pass |
| `build` | `pnpm build` | Keep working until build succeeds |
| `typecheck` | `pnpm typecheck` | Keep working until types clean |
| `lint` | `pnpm lint` | Keep working until lint passes |
| `manual` | - | Keep working until explicitly stopped |

### How It Works

1. User runs `hooked test` - sets `activePreset: "test"` in config
2. Claude works, tries to stop
3. Stop hook runs the preset's check command (`pnpm test`)
4. If check fails, hook returns `{"decision": "block"}` - Claude continues
5. If check passes, hook returns `{"decision": "approve"}` and auto-disables preset

## Key Files

- `src/core/config.ts` - Read/write `~/.hooked/config.json`
- `src/core/presets.ts` - Preset definitions and evaluation
- `src/cli/commands.ts` - CLI implementation
- `src/stop/evaluators/continuation.ts` - Preset-based evaluator

## Testing

```bash
# Test CLI flow
npx tsx src/cli/commands.ts test
npx tsx src/cli/commands.ts status
npx tsx src/cli/commands.ts off

# Test stop hook with preset active
npx tsx src/cli/commands.ts manual
echo '{"session_id":"test","transcript_path":"/test","stop_hook_active":false}' | npx tsx src/stop/default-hook.ts
# Should output: {"decision":"block","reason":"Continuation mode active - keep working"}

# Test stop hook with no preset
npx tsx src/cli/commands.ts off
echo '{"session_id":"test","transcript_path":"/test","stop_hook_active":false}' | npx tsx src/stop/default-hook.ts
# Should output: {"decision":"approve"}
```

## Dependencies

- **winston**: Structured logging
- **@arach/speakeasy**: Text-to-speech via ElevenLabs
- **@clack/prompts**: Interactive CLI prompts for init wizard
- **tsx**: TypeScript execution
- **zod**: Schema validation

## File Locations

```
~/.hooked/
├── config.json    # Active preset & flags
├── state/         # Per-session state files
├── src/           # Deployed source (copied during init)
└── history/       # Event logs

~/.claude/
├── settings.json  # Hook configuration
└── hooks/         # Hook entry points
```
