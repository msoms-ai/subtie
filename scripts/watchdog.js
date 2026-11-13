import http from 'http';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Load environment variables manually
function loadEnv() {
  const envPaths = [
    path.join(ROOT_DIR, 'server', '.env'),
    path.join(ROOT_DIR, '.env')
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf8').split('\n');
      for (const line of lines) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*['"]?(.*?)['"]?\s*$/);
        if (match && !process.env[match[1]]) {
          process.env[match[1]] = match[2];
        }
      }
    }
  }
}
loadEnv();

const PORT = process.env.PORT || 3001;
const HEALTH_URL = `http://127.0.0.1:${PORT}/api/health`;
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const ADMIN_EMAIL = 'msoms1@gmail.com';

// Cooldown tracking for alert emails (15 minutes)
let lastEmailSentAt = 0;
const EMAIL_COOLDOWN_MS = 15 * 60 * 1000;

function logSystemLog(level, category, message, details = {}) {
  try {
    const logsFile = path.join(ROOT_DIR, 'server', 'data', 'system_logs.json');
    let logs = [];
    if (fs.existsSync(logsFile)) {
      try { logs = JSON.parse(fs.readFileSync(logsFile, 'utf8')); } catch (_) { logs = []; }
    }
    const entry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details
    };
    logs.unshift(entry);
    if (logs.length > 500) logs = logs.slice(0, 500);
    fs.writeFileSync(logsFile, JSON.stringify(logs, null, 2), 'utf8');
  } catch (e) {
    console.error('[Watchdog] Failed to record system log:', e.message);
  }
}

async function sendDowntimeAlertEmail({ reason, actionTaken, success }) {
  const now = Date.now();
  if (now - lastEmailSentAt < EMAIL_COOLDOWN_MS) {
    console.log('[Watchdog] Email alert suppressed by cooldown window.');
    return;
  }
  if (!RESEND_API_KEY) {
    console.warn('[Watchdog] RESEND_API_KEY is not configured. Cannot send email alert.');
    return;
  }

  const subject = success
    ? '🚨 [Subtie Auto-Heal Alert] Service Downtime Detected & Auto-Recovered'
    : '❌ [Subtie Critical Alert] Service Downtime Detected & Auto-Recovery Failed';

  const html = `
    <!DOCTYPE html>
    <html dir="ltr">
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:24px;background-color:#090614;color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <div style="max-width:600px;margin:0 auto;background-color:#16102b;border:1px solid #7c3aed;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
        <div style="background:linear-gradient(135deg,#7c3aed,#ec4899);padding:24px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:900;letter-spacing:0.5px;">Subtie Auto-Healing Watchdog</h1>
          <p style="margin:6px 0 0 0;color:#fbcfe8;font-size:13px;font-weight:700;">Automatic Service Monitor & Disaster Recovery</p>
        </div>
        
        <div style="padding:28px 24px;">
          <div style="margin-bottom:20px;padding:16px;border-radius:12px;background-color:${success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'};border:1px solid ${success ? '#10b981' : '#ef4444'};">
            <span style="font-size:16px;font-weight:800;color:${success ? '#34d399' : '#f87171'};">
              ${success ? '✅ Status: Service Auto-Recovered Successfully' : '❌ Status: Service Still Unreachable'}
            </span>
          </div>

          <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px;">
            <tr>
              <td style="padding:8px 0;color:#a78bfa;font-weight:700;width:140px;">Incident Timestamp:</td>
              <td style="padding:8px 0;color:#ffffff;">${new Date().toUTCString()}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#a78bfa;font-weight:700;">Domain Affected:</td>
              <td style="padding:8px 0;color:#ffffff;">subtie.msoms.ai (Port ${PORT})</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#a78bfa;font-weight:700;">Detection Trigger:</td>
              <td style="padding:8px 0;color:#f87171;font-weight:700;">${reason}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#a78bfa;font-weight:700;">Action Performed:</td>
              <td style="padding:8px 0;color:#38bdf8;font-weight:700;">${actionTaken}</td>
            </tr>
          </table>

          <div style="background-color:#0d081f;padding:16px;border-radius:12px;border:1px solid #372a5a;font-size:12px;line-height:1.6;color:#cbd5e1;">
            <p style="margin:0 0 8px 0;font-weight:800;color:#e2e8f0;">What happened?</p>
            <p style="margin:0 0 8px 0;">The Subtie internal health probe detected that Node.js on port ${PORT} was unresponsive (returning Apache 503 or dropped connection). The Watchdog intervened and re-spawned the application with PM2.</p>
            <p style="margin:0;color:#94a3b8;">If this alert recurs frequently, please review VPS memory usage or check for high-concurrency tasks in the Admin Logs.</p>
          </div>
        </div>

        <div style="background-color:#0d081f;padding:16px;text-align:center;border-top:1px solid #2e1065;font-size:11px;color:#94a3b8;">
          Subtie Automated Health System • noreply@subtie.msoms.ai
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Subtie Health Watchdog <noreply@subtie.msoms.ai>',
        to: [ADMIN_EMAIL],
        subject,
        html
      })
    });
    const data = await res.json();
    if (res.ok) {
      lastEmailSentAt = now;
      console.log(`[Watchdog] Alert email dispatched successfully to ${ADMIN_EMAIL} (ID: ${data.id})`);
    } else {
      console.warn('[Watchdog] Resend error:', data);
    }
  } catch (err) {
    console.error('[Watchdog] Failed to send email alert:', err.message);
  }
}

function probeHealth(timeoutMs = 5000) {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_URL, { timeout: timeoutMs }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(body);
            if (parsed.status === 'ok') {
              return resolve({ ok: true, data: parsed });
            }
          } catch (_) {}
        }
        resolve({ ok: false, error: `HTTP ${res.statusCode}: ${body.slice(0, 100)}` });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'Health check probe timed out (5s)' });
    });

    req.on('error', (err) => {
      resolve({ ok: false, error: err.message });
    });
  });
}

function executeHealCommand() {
  return new Promise((resolve) => {
    // 1. Try pm2 startOrReload with ecosystem.config.cjs
    // 2. Fallback to pm2 start server/index.js
    // 3. Fallback to nohup node server/index.js
    const cmd = `
      export PATH=$PATH:/usr/local/bin:/usr/bin:/bin:~/.nvm/versions/node/$(ls ~/.nvm/versions/node 2>/dev/null | tail -n 1)/bin
      cd "${ROOT_DIR}"
      if command -v pm2 >/dev/null 2>&1; then
        pm2 startOrReload ecosystem.config.cjs --only subtie --update-env || pm2 start ecosystem.config.cjs --only subtie
        pm2 save || true
      elif command -v npx >/dev/null 2>&1; then
        npx pm2 startOrReload ecosystem.config.cjs --only subtie --update-env || npx pm2 start ecosystem.config.cjs --only subtie
        npx pm2 save || true
      else
        pkill -f "node server/index.js" || true
        nohup node server/index.js > server/logs/server.log 2>&1 &
      fi
    `;

    exec(cmd, { shell: '/bin/bash' }, (error, stdout, stderr) => {
      const output = `${stdout}\n${stderr}`.trim();
      if (error) {
        console.warn('[Watchdog Auto-Heal] Command warning:', error.message);
      }
      resolve({ success: !error, output });
    });
  });
}

let consecutiveFailures = 0;
let isHealingInProgress = false;

async function checkAndAutoHeal() {
  if (isHealingInProgress) return;

  const probe = await probeHealth();
  if (probe.ok) {
    if (consecutiveFailures > 0) {
      console.log(`✅ [Watchdog] Subtie recovered and is healthy. (PID: ${probe.data?.pid}, Uptime: ${Math.round(probe.data?.uptime || 0)}s)`);
      logSystemLog('info', 'watchdog', 'Service is back online and healthy', { probe: probe.data });
    }
    consecutiveFailures = 0;
    return true;
  }

  consecutiveFailures++;
  console.warn(`⚠️ [Watchdog] Health probe failed (${consecutiveFailures}/2): ${probe.error}`);

  // Trigger healing on first failure if connection refused, or after 2 consecutive failures
  const isConnRefused = probe.error?.includes('ECONNREFUSED');
  if (isConnRefused || consecutiveFailures >= 2) {
    isHealingInProgress = true;
    console.log('🚨 [Watchdog] Activating Auto-Heal: Restarting Subtie service via PM2...');
    logSystemLog('warn', 'watchdog', `Triggering Auto-Heal restart. Reason: ${probe.error}`);

    const healResult = await executeHealCommand();
    console.log('[Watchdog Auto-Heal Output]:', healResult.output || 'Done');

    // Wait 4 seconds and test again
    await new Promise(r => setTimeout(r, 4000));
    const recheck = await probeHealth(6000);

    const healed = recheck.ok;
    console.log(healed ? '🎉 [Watchdog] Auto-Heal SUCCESSFUL!' : '❌ [Watchdog] Auto-Heal failed to restore service.');

    logSystemLog(
      healed ? 'info' : 'error',
      'watchdog',
      healed ? 'Auto-Heal successfully restored Subtie' : 'Auto-Heal failed to bring Subtie online',
      { probeError: probe.error, healOutput: healResult.output }
    );

    // Send email alert to admin
    await sendDowntimeAlertEmail({
      reason: probe.error,
      actionTaken: 'Executed PM2 auto-reload with ecosystem.config.cjs',
      success: healed
    });

    isHealingInProgress = false;
    return healed;
  }

  return false;
}

// Check arguments: if '--daemon', run loop. Otherwise, run single check.
const isDaemon = process.argv.includes('--daemon');

if (isDaemon) {
  console.log(`🛡️ [Subtie Watchdog Daemon] Running continuous health monitoring on port ${PORT} (interval: 30s)...`);
  checkAndAutoHeal();
  setInterval(checkAndAutoHeal, 30000);
} else {
  checkAndAutoHeal().then(ok => {
    process.exit(ok ? 0 : 1);
  });
}
