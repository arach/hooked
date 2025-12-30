# AGENTS.md

Guidelines for AI coding agents working in this repository.

## Project Overview

TypeScript toolkit for Claude Code hooks. Provides voice notifications via SpeakEasy and smart continuation presets that keep Claude working until tests pass, build succeeds, or you say stop.

## Build/Lint/Test Commands

```bash
# Build TypeScript
pnpm build              # Runs tsc, outputs to dist/

# Run tests
pnpm test               # Runs bun src/test.ts
bun src/test.ts         # Direct test execution

# Run specific TypeScript file
npx tsx src/<file>.ts   # Execute any TS file directly

# Type checking (via build)
pnpm build              # tsc will report type errors

# Deploy
pnpm deploy             # Runs bun run deploy.ts

# Init wizard
pnpm hooked:init        # Interactive setup wizard
```

**No separate lint command exists.** TypeScript strict mode handles most style enforcement.

### Testing Hook Scripts

```bash
# Test stop hook
echo '{"session_id":"test","transcript_path":"/test"}' | npx tsx src/stop-hook.ts

# Test notification hook
echo '{"message":"Test","transcript_path":"/projects/test/"}' | npx tsx src/notification.ts

# Test CLI commands
npx tsx src/cli.ts status
npx tsx src/cli.ts test
npx tsx src/cli.ts off
```

## Code Style Guidelines

### Formatting

- **2-space indentation**
- **Single quotes** for strings
- **No semicolons** (preferred, some files use them)
- **Trailing newline** at end of files
- **No trailing commas** in single-line constructs

### Imports

Order imports as follows:

```typescript
// 1. Node.js built-ins (no 'node:' prefix)
import { homedir } from 'os'
import { existsSync, mkdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

// 2. External packages
import winston from 'winston'
import { SpeakEasy } from '@arach/speakeasy'

// 3. Internal modules (relative paths)
import { continuation } from './continuation'
import { config } from './core/config'
```

### Types

```typescript
// Interfaces for object shapes
export interface HookedConfig {
  activePreset: string | null
  flags: {
    speak: boolean
    logging: boolean
  }
}

// Union types for enums
export type ContinuationMode = 'manual' | 'check'

// Index signatures for dynamic keys
interface NotificationPayload {
  hook_event_name?: string
  [key: string]: unknown
}

// Always annotate function return types
function getLogFilePath(sessionId: string): string { }
async function main(): Promise<void> { }
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Variables/functions | camelCase | `getConfig`, `sessionId` |
| Interfaces/types | PascalCase | `HookedConfig`, `StopPayload` |
| Constants | UPPER_SNAKE_CASE | `HOOKED_HOME`, `DEFAULT_CONFIG` |
| Files | kebab-case | `stop-hook.ts`, `config.ts` |

### Error Handling

```typescript
// Try-catch with empty catch for non-critical operations
try {
  const content = readFileSync(CONFIG_FILE, 'utf-8')
  return JSON.parse(content)
} catch {
  return DEFAULT_CONFIG
}

// Error extraction helper pattern
function extractErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

// Process error handlers for hook scripts
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', { error: error.message })
  process.exit(1)
})

// Async main with catch
main().catch(error => {
  console.error('Fatal:', error)
  process.exit(1)
})
```

### Module Exports

Group related functions into namespace objects:

```typescript
export const config = {
  get: getConfig,
  save: saveConfig,
  getActivePreset,
  setActivePreset,
}

export const continuation = {
  getPending,
  setPending,
  clearPending,
}
```

### Async Patterns

```typescript
// Void operator for fire-and-forget top-level calls
void main()

// Promise-based stdin reading (common pattern in hooks)
function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', chunk => { data += chunk })
    process.stdin.on('end', () => resolve(data))
    process.stdin.on('error', reject)
  })
}
```

### Console Output

- `console.log()` for user-facing output and JSON responses
- `console.error('[hooked:stop] ...')` for debug/hook feedback with prefix
- Winston logger for structured logging in notification handler

### File Structure

```typescript
#!/usr/bin/env node           // Shebang for executable scripts
/**
 * File description           // JSDoc block for file purpose
 */

import { ... } from '...'     // Imports

interface Foo { }             // Type definitions

const CONSTANT = 'value'      // Constants

function helper() { }         // Helper functions

async function main() { }     // Main entry point

main().catch(...)             // Entry point invocation
```

## TypeScript Configuration

Strict mode is fully enabled. Key settings:

- `noImplicitAny`, `strictNullChecks`, `strict` - all enabled
- `noUnusedLocals`, `noUnusedParameters` - no dead code
- `noUncheckedIndexedAccess` - must check array/object access
- `noImplicitReturns` - all code paths must return

## Dependencies

**Runtime:**
- `@arach/speakeasy` - Text-to-speech via ElevenLabs
- `@clack/prompts` - Interactive CLI prompts
- `tsx` - TypeScript execution
- `winston` - Structured logging
- `zod` - Schema validation

**Preferred package manager:** pnpm

## File Locations

```
~/.hooked/
  config.json    # Active preset & flags
  state/         # Per-session state files

src/
  cli.ts         # CLI command router
  continuation.ts # State management
  init.ts        # Installation wizard
  notification.ts # Notification hook
  stop-hook.ts   # Stop hook handler
  core/
    config.ts    # Config file management
    log.ts       # JSONL event logging
    speak.ts     # TTS wrapper
```

## Git Commits

- Add gitmoji to commit messages
- Never add co-authoring attribution
- Never add "Generated with Claude Code" footers
