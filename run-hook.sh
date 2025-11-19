#!/bin/bash
# Hooked notification hook runner
# This script is deployed to ~/.claude/hooks/run-hook.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

HOOKED_LOG_FILE=true node --import tsx notification.ts
