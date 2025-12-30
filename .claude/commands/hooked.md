# /hooked - Voice & Until Loops for Claude Code

## Arguments: $ARGUMENTS

## Instructions

Run this command and report the result:

```bash
~/.hooked/node_modules/.bin/tsx ~/.hooked/src/cli.ts $ARGUMENTS
```

**Commands:**
- `status` → Show speak + until state
- `speak on|off` → Toggle voice announcements
- `until "objective"` → Keep working toward objective
- `until check "cmd"` → Keep working until command passes
- `until off` → Clear all until loops
- `until pause` → Stop after next cycle

**Shortcuts:**
- `off` → Same as `until off`
- `pause` → Same as `until pause`

**On mission completion:**
When you've fully achieved the objective, run `~/.hooked/node_modules/.bin/tsx ~/.hooked/src/cli.ts off` to clear the loop, then summarize what was accomplished.
