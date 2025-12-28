# /hooked - Contextual Continuation

Keep Claude working until an objective is complete or a check passes.

## Usage

```
/hooked continuation "<objective>"        - Manual mode: work until you say OFF
/hooked continuation --check "<command>"  - Check mode: work until command exits 0
/hooked continuation OFF                  - Disable continuation
/hooked status                            - Show current state
/hooked history                           - Show recent continuation sessions
/hooked notifications                     - Check notification setup
```

## Examples

```
/hooked continuation "fix the login form validation"
/hooked continuation --check "pnpm test src/auth.test.ts"
/hooked continuation --check "pnpm build"
/hooked continuation --check "./scripts/verify.sh"
/hooked continuation OFF
/hooked status
/hooked history
/hooked notifications
```

## Arguments: $ARGUMENTS

## Instructions

Parse the arguments.

### If "continuation" followed by "OFF" (case-insensitive):
1. Delete `~/.hooked/state/continuation.json` if it exists
2. Respond: "Continuation **disabled**."

### If "continuation --check" followed by a command:
1. Extract the command (may be quoted or unquoted)
2. Create `~/.hooked/state/continuation.json`:
```json
{
  "active": true,
  "mode": "check",
  "check": "<the command>",
  "createdAt": "<ISO timestamp>",
  "project": "<current project name>"
}
```
3. Respond: "Continuation **enabled** (check mode). I'll keep working until `<command>` passes."

### If "continuation" followed by an objective (no --check):
1. Extract the objective (may be quoted or unquoted)
2. Create `~/.hooked/state/continuation.json`:
```json
{
  "active": true,
  "mode": "manual",
  "objective": "<the objective text>",
  "createdAt": "<ISO timestamp>",
  "project": "<current project name>"
}
```
3. Respond: "Continuation **enabled** (manual mode). I'll keep working until: **<objective>**"

### If "status" or empty:
1. Read `~/.hooked/state/continuation.json` if it exists
2. If check mode: "Continuation **enabled** (check): `<command>`"
3. If manual mode: "Continuation **enabled** (manual): <objective>"
4. If not active: "Continuation **disabled**"

### If "history":
1. List files in `~/.hooked/history/` (most recent first, limit 10)
2. For each JSONL file, read the first and last lines to get session info
3. Display a summary table showing:
   - Date/time
   - Project name
   - Mode (manual/check)
   - Objective or check command
   - Iterations count
   - Outcome (completed/stopped/max iterations)
4. If no history files exist: "No continuation history found."

### If "notifications":
1. Check if `~/.hooked/src/notification.ts` exists
2. Respond based on whether the script is installed:

**If notification script exists:**
```
Notification hook is **installed**.

When Claude stops or needs your attention, this script runs and announces it via voice (using SpeakEasy).

Script: ~/.hooked/src/notification.ts

To customize behavior, edit the script directly.
SpeakEasy setup: https://github.com/arach/speakeasy
```

**If notification script is NOT found:**
```
Notification hook is **not installed**.

Run `pnpm run hooked:init` to set it up.
```

## How It Works
- **Manual mode**: Claude keeps working until you say `/hooked continuation OFF`
- **Check mode**: Claude keeps working until the command exits 0
- The stop hook reads `~/.hooked/state/continuation.json` and decides accordingly
- Each iteration logs to `~/.hooked/history/`
- Safety limit: max iterations (default 3) prevents runaway loops
