#!/bin/bash
# Subtie Watchdog Runner for Cron & Plesk Scheduled Tasks
# Usage: * * * * * bash /var/www/vhosts/msoms.ai/subtie.msoms.ai/scripts/watchdog.sh >> /var/www/vhosts/msoms.ai/subtie.msoms.ai/server/logs/watchdog.log 2>&1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

for p in \
  /opt/plesk/node/22/bin \
  /opt/plesk/node/20/bin \
  /opt/plesk/node/18/bin \
  /opt/plesk/node/*/bin \
  ~/.nvm/versions/node/*/bin \
  /usr/local/bin \
  /usr/bin
do
  if [ -x "$p/node" ]; then
    NODE_MAJOR=$("$p/node" -v 2>/dev/null | tr -d 'v' | cut -d. -f1)
    if [ "$NODE_MAJOR" -ge 18 ] 2>/dev/null; then
      export PATH="$p:$PATH"
      break
    fi
  fi
done

cd "$ROOT_DIR"
node scripts/watchdog.js
