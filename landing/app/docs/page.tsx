"use client"

import { useState, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeSlug from "rehype-slug"
import rehypeAutolinkHeadings from "rehype-autolink-headings"
import { Sun, Moon, Github, ArrowLeft } from "lucide-react"
import Link from "next/link"

// Import the markdown content
const docsContent = `# Hooked Documentation

Voice announcements and session-scoped until loops for Claude Code.

## Table of Contents

- [Introduction](#introduction)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Speak (Voice)](#speak-voice)
- [Until Loops](#until-loops)
- [History & Dashboard](#history--dashboard)
- [CLI Reference](#cli-reference)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

---

## Introduction

**Hooked** solves two problems with Claude Code:

1. **Missed prompts** — You're in another app, Claude needs permission, you don't notice for 10 minutes
2. **Premature stops** — Claude says "done" but tests are failing, build is broken, work isn't actually complete

Hooked adds:
- **Voice announcements** via SpeakEasy when Claude needs your attention
- **Session-scoped until loops** that keep Claude working toward your objective

### How It Works

Hooked installs [Claude Code hooks](https://code.claude.com/docs/en/hooks-guide) that intercept events:

- **Notification hooks** — Trigger voice announcements on permission requests, errors, or when Claude is waiting
- **Stop hooks** — Evaluate whether Claude should continue working based on your objective or check command

### Key Feature: Session-Scoped Until Loops

Until loops are bound to specific Claude sessions using a "lazy binding" pattern:

1. You set a pending until loop (objective or check command)
2. The next Claude session that tries to stop claims it
3. That session keeps working until the objective is complete or check passes
4. Other sessions are unaffected

### Requirements

- [Claude Code](https://claude.ai/code) installed and configured
- Node.js 18+
- macOS or Linux
- (Optional) [SpeakEasy](https://github.com/arach/speakeasy) for voice announcements

---

## Installation

### One-liner (recommended)

\`\`\`bash
curl -fsSL https://raw.githubusercontent.com/arach/hooked/master/install.sh | bash
\`\`\`

This will automatically:
- Download and set up hooked in \`~/.hooked/\`
- Configure Claude Code's \`settings.json\` with hook definitions
- Install the \`/hooked\` slash command

### Manual installation

If you prefer to install manually:

\`\`\`bash
git clone https://github.com/arach/hooked.git
cd hooked
pnpm install
pnpm run hooked:init
\`\`\`

### (Optional) Set up SpeakEasy for voice announcements

\`\`\`bash
npm install -g @arach/speakeasy
speakeasy config
\`\`\`

Follow the prompts to configure your TTS provider (ElevenLabs recommended).

---

## Quick Start

### Start an until loop

\`\`\`bash
# Keep Claude working toward an objective
hooked until "API docs are 100% coverage"

# Or keep working until a command passes
hooked until check "pnpm test"
\`\`\`

### What happens next

1. You set a pending until loop
2. Next time Claude tries to stop, it claims the loop
3. Voice announces: "Loop started. API docs are 100% coverage"
4. Claude keeps working, announcing each round: "Round 2. Objective: API docs are 100% coverage"
5. When you're satisfied, run \`hooked off\`
6. Voice announces: "Mission complete."

### End the loop

\`\`\`bash
hooked off
\`\`\`

---

## Speak (Voice)

Voice announcements notify you audibly when Claude needs attention or continuation state changes.

### What triggers voice

| Event | Voice Message |
|-------|---------------|
| Permission request | "In {project}, Claude needs your permission" |
| Waiting for input | "In {project}, Claude is waiting for you" |
| Loop started | "In {project}, loop started. {objective}" |
| Each round | "In {project}, round N. Objective: {objective}" |
| Check passed | "In {project}, check passed. Loop complete." |
| Check failed | "In {project}, check failed. Keep working." |
| Mission complete | "Mission complete." |
| Paused | "In {project}, pausing as requested." |

### Toggle speak

\`\`\`bash
# Turn off voice
hooked speak off

# Turn on voice
hooked speak on

# Check current status
hooked speak
\`\`\`

### SpeakEasy setup

1. Install SpeakEasy globally:
   \`\`\`bash
   npm install -g @arach/speakeasy
   \`\`\`

2. Configure your TTS provider:
   \`\`\`bash
   speakeasy config
   \`\`\`

3. Test it works:
   \`\`\`bash
   speakeasy say "Hello from hooked"
   \`\`\`

Supported providers: ElevenLabs, OpenAI TTS, Azure, Google Cloud TTS, and more.

---

## Until Loops

Until loops keep Claude working toward your goal. Two modes are available:

### Manual Mode

Keep Claude working toward a stated objective until you say stop.

\`\`\`bash
hooked until "API docs are 100% coverage"
\`\`\`

Claude will keep working, announcing each round, until you run \`hooked off\`.

### Check Mode

Keep Claude working until a command passes.

\`\`\`bash
hooked until check "pnpm test"
hooked until check "pnpm build"
hooked until check "pnpm typecheck"
\`\`\`

When Claude tries to stop:
1. The hook runs your check command
2. **If check fails** → Claude continues working
3. **If check passes** → Loop auto-clears, Claude stops

### Session-Scoped Binding

Until loops are bound to specific sessions:

\`\`\`
Terminal 1: hooked until "100% test coverage"
            → Creates pending.json

Session A:  Claude tries to stop
            → Claims pending → state/sessionA.json
            → Speaks "Loop started"
            → Blocks

Session B:  Claude tries to stop
            → No pending, no state/sessionB.json
            → Approves (unaffected)

Session A:  User runs: hooked off
            → Clears state/sessionA.json
            → Speaks "Mission complete"
\`\`\`

### Pausing vs Stopping

- **\`hooked off\`** — Immediately clears all until loops
- **\`hooked pause\`** — Gracefully stops after the current cycle completes

---

## History & Dashboard

Hooked logs all events to a SQLite database for review and analysis.

### View Recent Events

\`\`\`bash
hooked history        # Last 20 events
hooked history 50     # Last 50 events
hooked history --full # Include full Claude payload
\`\`\`

### Search & Stats

\`\`\`bash
hooked history stats         # Event counts by project
hooked history search "auth" # Search messages
\`\`\`

### Export & Cleanup

\`\`\`bash
hooked history export json > backup.json  # Export to JSON
hooked history export csv > backup.csv    # Export to CSV
hooked history prune 30                   # Delete events older than 30 days
\`\`\`

### Web Dashboard

View your event history in a browser with filtering, search, and live updates:

\`\`\`bash
hooked web        # Opens http://localhost:3456
hooked web 8080   # Custom port
\`\`\`

The dashboard shows:
- Real-time event stream with auto-refresh
- Filter by event type (notification, spoken, continuation, etc.)
- Search across all events
- Project statistics

---

## CLI Reference

### Status

\`\`\`bash
hooked status
hooked s
\`\`\`

Show current speak setting, pending until loops, and active sessions.

### Speak

\`\`\`bash
hooked speak on       # Enable voice
hooked speak off      # Disable voice
hooked speak          # Show current status
hooked sp on          # Short form
\`\`\`

### Until

\`\`\`bash
# Manual mode - keep working toward objective
hooked until "implement feature X"
hooked u "implement feature X"

# Check mode - keep working until command passes
hooked until check "pnpm test"
hooked u check "pnpm build"

# Clear all until loops
hooked until off
hooked u off

# Pause after next cycle
hooked until pause
hooked u pause
\`\`\`

### History

\`\`\`bash
hooked history [n]           # Show recent events (default: 20)
hooked history stats         # Event counts by project
hooked history search <q>    # Search events
hooked history export [json|csv]  # Export all events
hooked history prune [days]  # Delete old events (default: 30)
hooked h 50                  # Short form
\`\`\`

### Web Dashboard

\`\`\`bash
hooked web [port]    # Open dashboard (default: 3456)
hooked dashboard     # Alias for web
\`\`\`

### Shortcuts

\`\`\`bash
hooked off      # Same as: hooked until off
hooked pause    # Same as: hooked until pause
\`\`\`

### Using the Slash Command

From within Claude Code:

\`\`\`
/hooked status
/hooked until "my objective"
/hooked off
\`\`\`

---

## Configuration

Configuration is stored in \`~/.hooked/config.json\`:

\`\`\`json
{
  "flags": {
    "speak": true,
    "logging": true
  },
  "templates": {
    "loopStarted": "In {project}, loop started. {goal}",
    "checkPassed": "In {project}, check passed. Loop complete.",
    "checkFailed": "In {project}, check failed. Keep working.",
    "pausing": "In {project}, pausing as requested.",
    "manualRound": "In {project}, round {round}. Objective: {objective}",
    "missionComplete": "Mission complete."
  }
}
\`\`\`

### Options

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| \`flags.speak\` | boolean | \`true\` | Enable voice announcements |
| \`flags.logging\` | boolean | \`true\` | Enable event logging |

### Voice Templates

Customize what Claude says at each event. Available variables:

| Template | Variables | When |
|----------|-----------|------|
| \`loopStarted\` | \`{project}\`, \`{goal}\` | Loop claimed by session |
| \`checkPassed\` | \`{project}\` | Check command succeeded |
| \`checkFailed\` | \`{project}\` | Check command failed |
| \`pausing\` | \`{project}\` | User requested pause |
| \`manualRound\` | \`{project}\`, \`{round}\`, \`{objective}\` | Each manual mode iteration |
| \`missionComplete\` | (none) | All loops cleared |

### File locations

\`\`\`
~/.hooked/
├── config.json       # Configuration
├── pending.json      # Pending until loop (waiting to be claimed)
├── sessions.json     # Session registry (project → session mapping)
├── history.sqlite    # SQLite event history database
├── pause             # Pause flag (if present, next cycle stops)
├── state/            # Session-bound state files
│   ├── {sessionId}.json
│   └── ...
└── src/              # Hook source files

~/.claude/
├── commands/
│   └── hooked.md     # Slash command definition
└── settings.json     # Claude Code hook configuration
\`\`\`

---

## Troubleshooting

### Voice not working

1. **Check SpeakEasy is installed:**
   \`\`\`bash
   speakeasy --version
   \`\`\`

2. **Test SpeakEasy directly:**
   \`\`\`bash
   speakeasy say "Test message"
   \`\`\`

3. **Check speak flag is enabled:**
   \`\`\`bash
   hooked speak
   \`\`\`

4. **Check logs for errors:**
   \`\`\`bash
   tail -f ~/logs/claude-hooks/notification.log
   \`\`\`

### Until loop not triggering

1. **Check status:**
   \`\`\`bash
   hooked status
   \`\`\`

2. **Verify a pending loop exists:**
   \`\`\`bash
   cat ~/.hooked/pending.json
   \`\`\`

3. **Re-run setup:**
   \`\`\`bash
   pnpm run hooked:init
   \`\`\`

4. **Restart Claude Code session** (hooks are loaded at session start)

### Claude keeps working forever

1. **Check if there's an active session:**
   \`\`\`bash
   hooked status
   \`\`\`

2. **Force disable:**
   \`\`\`bash
   hooked off
   \`\`\`

3. **For check mode, verify your command:**
   \`\`\`bash
   pnpm test  # Does it actually pass?
   \`\`\`

### Hook errors in Claude Code

1. **Check hook logs:**
   \`\`\`bash
   tail -f ~/logs/claude-hooks/notification.log
   \`\`\`

2. **Test stop hook manually:**
   \`\`\`bash
   echo '{"session_id":"test","transcript_path":"/test"}' | ~/.hooked/node_modules/.bin/tsx ~/.hooked/src/stop-hook.ts
   \`\`\`

---

## FAQ

### Is hooked safe to use?

Yes. Hooked only adds hooks that:
- Read events (notifications)
- Run your own commands (for check mode)
- Return continue/stop decisions

It doesn't modify Claude's behavior beyond what hooks are designed for.

### Does it work with other package managers?

Yes. You can specify any command:

\`\`\`bash
hooked until check "npm test"
hooked until check "yarn test"
hooked until check "make test"
\`\`\`

### Can I have multiple until loops at once?

Yes! Each Claude session gets its own loop. Set a pending, it binds to the next session that stops.

### What happens if my check command hangs?

The check command has a timeout (60 seconds). If it hangs, it's treated as a failure and Claude continues working.

### Does it work with remote/SSH sessions?

Voice requires local audio output. Until loops work anywhere Claude Code runs.

### Can I customize the voice?

Yes, through SpeakEasy. Run \`speakeasy config\` to choose different voices, providers, and settings.

### How do I uninstall?

\`\`\`bash
# Remove hooked files
rm -rf ~/.hooked

# Remove slash command
rm ~/.claude/commands/hooked.md

# Remove hook configuration from ~/.claude/settings.json
# (edit manually to remove the hooks entries)
\`\`\`

---

## Resources

- [Claude Code Documentation](https://code.claude.com/docs/en/overview)
- [Claude Code Hooks Guide](https://code.claude.com/docs/en/hooks-guide)
- [SpeakEasy TTS Library](https://github.com/arach/speakeasy)
- [Hooked GitHub Repository](https://github.com/arach/hooked)

---

**Default: OFF** — Until loops only activate when you explicitly set one. Voice is always on (if SpeakEasy is configured).
`

export default function DocsPage() {
  const [isDark, setIsDark] = useState(true)

  // Theme classes
  const theme = {
    bg: isDark ? "bg-black" : "bg-white",
    text: isDark ? "text-white" : "text-neutral-900",
    textMuted: isDark ? "text-white/70" : "text-neutral-600",
    textSubtle: isDark ? "text-white/50" : "text-neutral-400",
    cardBg: isDark ? "bg-white/[0.03]" : "bg-neutral-50",
    cardBorder: isDark ? "border-white/10" : "border-neutral-200",
    codeBg: isDark ? "bg-white/[0.05]" : "bg-neutral-100",
  }

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} transition-colors duration-300`}>
      {/* Background */}
      {isDark && (
        <>
          <div className="fixed inset-0 bg-gradient-to-br from-black via-neutral-950 to-black" />
          <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.03),transparent_50%)]" />
        </>
      )}
      {!isDark && (
        <div className="fixed inset-0 bg-gradient-to-br from-white via-neutral-50 to-white" />
      )}

      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-md ${isDark ? "bg-black/80" : "bg-white/80"} border-b ${theme.cardBorder}`}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className={`flex items-center gap-2 ${theme.textMuted} hover:${theme.text} transition-colors`}>
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back</span>
            </Link>
            <div className={`h-4 w-px ${isDark ? "bg-white/10" : "bg-neutral-200"}`} />
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg border ${theme.cardBorder} ${theme.cardBg} flex items-center justify-center`}>
                <img src="/hooked-logo.png" alt="Hooked Logo" className="w-5 h-5 object-contain" />
              </div>
              <span className={`text-sm font-medium ${theme.text}`}>Docs</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/arach/hooked"
              target="_blank"
              rel="noopener noreferrer"
              className={`${theme.textMuted} hover:${theme.text} transition-colors`}
            >
              <Github className="w-5 h-5" />
            </a>
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-lg transition-all duration-200 ${
                isDark
                  ? "hover:bg-white/10 text-white/60 hover:text-white"
                  : "hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900"
              }`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="relative max-w-4xl mx-auto px-6 py-12">
        <article className={`prose prose-lg max-w-none ${isDark ? "prose-invert" : ""}`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSlug, rehypeAutolinkHeadings]}
            components={{
              h1: ({ children }) => (
                <h1 className={`text-4xl font-bold mb-8 ${theme.text}`}>{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className={`text-2xl font-semibold mt-12 mb-4 pb-2 border-b ${theme.cardBorder} ${theme.text}`}>{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className={`text-xl font-medium mt-8 mb-3 ${theme.text}`}>{children}</h3>
              ),
              p: ({ children }) => (
                <p className={`mb-4 leading-relaxed ${theme.textMuted}`}>{children}</p>
              ),
              a: ({ href, children }) => (
                <a href={href} className="text-sky-500 hover:text-sky-400 underline underline-offset-2" target={href?.startsWith("http") ? "_blank" : undefined} rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}>
                  {children}
                </a>
              ),
              ul: ({ children }) => (
                <ul className={`mb-4 ml-6 list-disc space-y-2 ${theme.textMuted}`}>{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className={`mb-4 ml-6 list-decimal space-y-2 ${theme.textMuted}`}>{children}</ol>
              ),
              li: ({ children }) => (
                <li className="leading-relaxed">{children}</li>
              ),
              code: ({ className, children }) => {
                const isBlock = className?.includes("language-")
                if (isBlock) {
                  return (
                    <code className={`${className} block`}>
                      {children}
                    </code>
                  )
                }
                return (
                  <code className={`px-1.5 py-0.5 rounded text-sm font-[family-name:var(--font-geist-mono)] ${isDark ? "bg-white/10 text-sky-400" : "bg-neutral-100 text-sky-600"}`}>
                    {children}
                  </code>
                )
              },
              pre: ({ children }) => (
                <pre className={`mb-6 p-4 rounded-xl overflow-x-auto font-[family-name:var(--font-geist-mono)] text-sm ${isDark ? "bg-white/[0.05] border border-white/10" : "bg-neutral-100 border border-neutral-200"}`}>
                  {children}
                </pre>
              ),
              table: ({ children }) => (
                <div className="mb-6 overflow-x-auto">
                  <table className={`w-full text-sm border-collapse border ${theme.cardBorder} rounded-lg overflow-hidden`}>
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className={isDark ? "bg-white/[0.05]" : "bg-neutral-50"}>
                  {children}
                </thead>
              ),
              th: ({ children }) => (
                <th className={`px-4 py-3 text-left font-medium border-b ${theme.cardBorder} ${theme.text}`}>
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className={`px-4 py-3 border-b ${theme.cardBorder} ${theme.textMuted}`}>
                  {children}
                </td>
              ),
              hr: () => (
                <hr className={`my-8 border-t ${theme.cardBorder}`} />
              ),
              blockquote: ({ children }) => (
                <blockquote className={`pl-4 border-l-4 ${isDark ? "border-sky-500/50" : "border-sky-500"} italic ${theme.textMuted}`}>
                  {children}
                </blockquote>
              ),
              strong: ({ children }) => (
                <strong className={`font-semibold ${theme.text}`}>{children}</strong>
              ),
            }}
          >
            {docsContent}
          </ReactMarkdown>
        </article>
      </main>

      {/* Footer */}
      <footer className={`relative border-t ${theme.cardBorder} py-8`}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className={`text-sm ${theme.textSubtle}`}>
            Built with <span className="text-red-500">&hearts;</span> by <a href="https://x.com/arach" target="_blank" rel="noopener noreferrer" className={`${theme.textMuted} hover:${theme.text}`}>@arach</a> · <a href="https://arach.dev" target="_blank" rel="noopener noreferrer" className={`${theme.textMuted} hover:${theme.text}`}>arach.dev</a>
          </p>
        </div>
      </footer>
    </div>
  )
}
