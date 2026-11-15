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

# 1. Search and prioritize modern Node.js versions (Node 22, 20, 18)
# Plesk stores its Node binaries in /opt/plesk/node/<version>/bin
# We search Plesk node versions first, then NVM, then /usr/local/bin, avoiding ancient system node (10.19.0)
FOUND_MODERN_NODE=0
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
      echo "✅ Selected modern Node.js runtime from: $p"
      FOUND_MODERN_NODE=1
      break
    fi
  fi
done

if [ "$FOUND_MODERN_NODE" -eq 0 ]; then
  echo "⚠️ Warning: No Node >= 18 found in standard Plesk paths. Current: $(node -v 2>/dev/null || echo 'none')"
  export PATH=$PATH:/usr/local/bin:/usr/bin:/bin
fi

echo "📦 Active Node version: $(node -v 2>/dev/null || echo 'not found')"
echo "📦 Active NPM version:  $(npm -v 2>/dev/null || echo 'not found')"

# 2. Create required directories and ensure write permissions
mkdir -p server/logs server/data server/uploads/torrents server/uploads/torrents_incoming
chmod -R 775 server/logs server/data server/uploads 2>/dev/null || true

# 3. Install production dependencies
echo "📥 Installing dependencies with modern npm..."
npm install --no-audit --no-fund || npm install --omit=dev --no-audit --no-fund

# 3b. Ensure native WebTorrent binaries exist (node-datachannel)
if [ -d "node_modules/node-datachannel" ] && [ ! -f "node_modules/node-datachannel/build/Release/node_datachannel.node" ]; then
    echo "📦 Prebuilding node-datachannel native binaries..."
    (cd node_modules/node-datachannel && npx prebuild-install -r napi || true)
fi

# 4. Build Vite frontend assets if vite is available (prebuilt dist already committed as fallback)
if [ -f "./node_modules/.bin/vite" ]; then
    echo "🔨 Building frontend assets with Vite..."
    npm run build || echo "⚠️ Vite build failed or skipped; using committed dist/ bundle."
else
    echo "ℹ️ Using pre-bundled production assets in dist/."
fi

# 5. Start or Reload PM2
echo "🔄 Starting or Reloading PM2 processes..."
PM2_CMD=""
if [ -x "./node_modules/.bin/pm2" ]; then
    PM2_CMD="./node_modules/.bin/pm2"
elif command -v pm2 >/dev/null 2>&1; then
    PM2_CMD="pm2"
elif command -v npx >/dev/null 2>&1; then
    PM2_CMD="npx pm2"
fi

if [ -n "$PM2_CMD" ]; then
    echo "Using PM2: $PM2_CMD"
    $PM2_CMD startOrReload ecosystem.config.cjs --update-env || $PM2_CMD start ecosystem.config.cjs
    $PM2_CMD save || true
else
    echo "⚠️ PM2 not found; starting node directly in background..."
    pkill -f "node server/index.js" || true
    nohup node server/index.js > server/logs/server.log 2>&1 &
fi

echo "========================================================"
echo "✅ [Subtie Deploy] Deployment completed successfully!"
echo "========================================================"
