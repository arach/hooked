# /hooked - Voice Announcements & Continuations

## Arguments: $ARGUMENTS

## Instructions

Run this command and report the result:

```bash
~/.hooked/node_modules/.bin/tsx ~/.hooked/src/cli.ts $ARGUMENTS
```

**Commands:**
- `status` → Show announcements + continuations state
- `announcements on|off` → Toggle voice announcements
- `continuations "objective"` → Keep working toward objective
- `continuations check "cmd"` → Keep working until command passes
- `continuations off` → Clear all continuations
- `continuations pause` → Stop after next cycle

**Shortcuts:**
- `off` → Same as `continuations off`
- `pause` → Same as `continuations pause`

**On mission completion:**
When you've fully achieved the continuation objective, run `~/.hooked/node_modules/.bin/tsx ~/.hooked/src/cli.ts off` to clear the continuation, then summarize what was accomplished.
