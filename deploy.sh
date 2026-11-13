#!/bin/bash
set -e

# ==============================================================================
# Subtie Automated Deployment & Auto-Recovery Script
# For Plesk Git "Additional deployment actions" or manual SSH deployment
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================================"
echo "🚀 [Subtie Deploy] Starting automated deployment..."
echo "📅 Date: $(date)"
echo "📂 Directory: $SCRIPT_DIR"
echo "========================================================"

# 1. Expand PATH so node, npm, and pm2 are available in non-interactive Plesk hooks
export PATH=$PATH:/usr/local/bin:/usr/bin:/bin:~/.nvm/versions/node/$(ls ~/.nvm/versions/node 2>/dev/null | tail -n 1)/bin

# 2. Check Node & NPM versions
echo "📦 Node version: $(node -v 2>/dev/null || echo 'not found')"
echo "📦 NPM version:  $(npm -v 2>/dev/null || echo 'not found')"

# 3. Create required runtime directories if missing
mkdir -p server/logs server/data server/uploads/torrents server/uploads/torrents_incoming

# 4. Install production dependencies
echo "📥 Installing production dependencies..."
npm install --omit=dev --no-audit --no-fund

# 5. Build Vite frontend production bundle
echo "🔨 Building frontend assets with Vite..."
npm run build

# 6. Start or Reload PM2 with ecosystem.config.cjs
echo "🔄 Starting or Reloading PM2 processes..."
if command -v pm2 >/dev/null 2>&1; then
    pm2 startOrReload ecosystem.config.cjs --update-env || pm2 start ecosystem.config.cjs
    pm2 save || true
elif command -v npx >/dev/null 2>&1; then
    npx pm2 startOrReload ecosystem.config.cjs --update-env || npx pm2 start ecosystem.config.cjs
    npx pm2 save || true
else
    echo "⚠️ PM2 not found in PATH! Falling back to background node..."
    pkill -f "node server/index.js" || true
    nohup node server/index.js > server/logs/server.log 2>&1 &
fi

echo "========================================================"
echo "✅ [Subtie Deploy] Deployment completed successfully!"
echo "========================================================"
