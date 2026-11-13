#!/bin/bash
# Subtie Watchdog Runner for Cron & Plesk Scheduled Tasks
# Usage: * * * * * bash /var/www/vhosts/msoms.ai/subtie.msoms.ai/scripts/watchdog.sh >> /var/www/vhosts/msoms.ai/subtie.msoms.ai/server/logs/watchdog.log 2>&1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

export PATH=$PATH:/usr/local/bin:/usr/bin:/bin:~/.nvm/versions/node/$(ls ~/.nvm/versions/node 2>/dev/null | tail -n 1)/bin
cd "$ROOT_DIR"

# Run single-probe watchdog check
node scripts/watchdog.js
