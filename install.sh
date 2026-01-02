#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
DIM='\033[2m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}hooked${NC} - Smart hooks for Claude Code"
echo -e "${DIM}────────────────────────────────────${NC}"
echo ""

# Check for required tools
check_command() {
  if ! command -v "$1" &> /dev/null; then
    echo -e "${RED}Error:${NC} $1 is required but not installed."
    exit 1
  fi
}

check_command "git"
check_command "node"

# Detect package manager
if command -v pnpm &> /dev/null; then
  PKG_MANAGER="pnpm"
elif command -v bun &> /dev/null; then
  PKG_MANAGER="bun"
elif command -v npm &> /dev/null; then
  PKG_MANAGER="npm"
else
  echo -e "${RED}Error:${NC} No package manager found (pnpm, bun, or npm required)"
  exit 1
fi

echo -e "${DIM}Using $PKG_MANAGER${NC}"

# Install location
HOOKED_DIR="$HOME/.hooked"
TEMP_DIR=$(mktemp -d)

cleanup() {
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

# Clone repo
echo -e "${BLUE}→${NC} Downloading hooked..."
git clone --depth 1 --quiet https://github.com/arach/hooked.git "$TEMP_DIR"

# Install dependencies
echo -e "${BLUE}→${NC} Installing dependencies..."
cd "$TEMP_DIR"
$PKG_MANAGER install --silent 2>/dev/null || $PKG_MANAGER install

# Run init
echo -e "${BLUE}→${NC} Setting up hooks..."
if [ "$PKG_MANAGER" = "pnpm" ]; then
  pnpm run hooked:init --yes 2>/dev/null || npx tsx src/init.ts --yes
elif [ "$PKG_MANAGER" = "bun" ]; then
  bun run src/init.ts --yes
else
  npx tsx src/init.ts --yes
fi

echo ""
echo -e "${GREEN}✓${NC} Hooked installed successfully!"
echo ""
echo -e "  ${DIM}Voice announcements:${NC} Enabled"
echo -e "  ${DIM}Until loops:${NC}         Ready"
echo -e "  ${DIM}Slash command:${NC}       /hooked"
echo ""
echo -e "  ${DIM}Try:${NC} hooked status"
echo ""
