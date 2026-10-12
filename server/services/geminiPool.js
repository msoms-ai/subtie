import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const KEYS_STORE_PATH = path.resolve('server', 'data', 'gemini_keys.json');

class GeminiPoolManager {
  constructor() {
    this.keys = [];
    this.detectedEnvNames = [];
    this.initPool();
  }

  loadStoredKeys() {
    try {
      if (fs.existsSync(KEYS_STORE_PATH)) {
        const raw = fs.readFileSync(KEYS_STORE_PATH, 'utf8');
        const list = JSON.parse(raw);
        if (Array.isArray(list)) return list.filter(k => typeof k === 'string' && k.trim());
      }
    } catch (e) {}
    return [];
  }

  saveStoredKeys(keysArray) {
    try {
      const dir = path.dirname(KEYS_STORE_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const rawList = keysArray.map(k => k.rawKey || k).filter(Boolean);
      fs.writeFileSync(KEYS_STORE_PATH, JSON.stringify([...new Set(rawList)], null, 2), 'utf8');
    } catch (e) {
      console.error('[GeminiPool] Failed to persist keys:', e.message);
    }
  }

  initPool() {
    let rawKeys = [];
    this.detectedEnvNames = [];

    // 0. Load persistent keys added through Admin Console
    const stored = this.loadStoredKeys();
    if (stored.length > 0) {
      rawKeys.push(...stored);
    }

    // Helper to check env files if process.env was populated after module evaluation
    const tryLoadEnvFile = (filePath) => {
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          content.split('\n').forEach(line => {
            const m = line.match(/^\s*(GEMINI_[\w]+)\s*=\s*['"]?(.*?)['"]?\s*$/i);
            if (m) {
              const [, keyName, val] = m;
              const upper = keyName.toUpperCase();
              if (val && val.trim()) {
                if (!this.detectedEnvNames.includes(upper)) this.detectedEnvNames.push(upper);
                if (upper === 'GEMINI_API_KEYS' || upper === 'GEMINI_KEYS') {
                  rawKeys.push(...val.split(',').map(k => k.trim()).filter(Boolean));
                } else if (upper.startsWith('GEMINI_KEY_') || upper.startsWith('GEMINI_API_KEY_') || upper === 'GEMINI_API_KEY') {
                  rawKeys.push(val.trim());
                }
              }
            }
          });
        }
      } catch (e) {}
    };

    // 1. Case-insensitive search across all process.env keys
    Object.keys(process.env).forEach(envKey => {
      const upper = envKey.toUpperCase().trim();
      if (upper === 'GEMINI_API_KEYS' || upper === 'GEMINI_KEYS') {
        if (!this.detectedEnvNames.includes(upper)) this.detectedEnvNames.push(upper);
        rawKeys.push(...process.env[envKey].split(',').map(k => k.trim()).filter(Boolean));
      } else if (upper.startsWith('GEMINI_KEY_') || upper.startsWith('GEMINI_API_KEY_') || upper === 'GEMINI_API_KEY') {
        if (!this.detectedEnvNames.includes(upper)) this.detectedEnvNames.push(upper);
        const val = process.env[envKey];
        if (val && val.trim()) rawKeys.push(val.trim());
      }
    });

    // 2. Check settings.json
    try {
      const settingsPath = path.resolve('server', 'data', 'settings.json');
      if (fs.existsSync(settingsPath)) {
        const s = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        if (s.geminiApiKey && s.geminiApiKey.trim()) rawKeys.push(s.geminiApiKey.trim());
      }
    } catch (e) {}

    // 3. Fallback: Parse .env files across all possible directories
    tryLoadEnvFile(path.resolve('.env'));
    tryLoadEnvFile(path.resolve('server', '.env'));
    tryLoadEnvFile(path.resolve('..', '.env'));
    tryLoadEnvFile('/var/www/vhosts/msoms.ai/subtie.msoms.ai/.env');
    tryLoadEnvFile('/var/www/vhosts/msoms.ai/subtie.msoms.ai/server/.env');

    // Remove duplicates and blanks
    rawKeys = [...new Set(rawKeys.map(k => k.trim()).filter(Boolean))];

    this.keys = rawKeys.map((key, index) => ({
      id: `key_${index + 1}`,
      rawKey: key,
      maskedKey: this.maskKey(key),
      status: 'active', // active, rate_limited, exhausted, disabled
      activeRequests: 0,
      totalRequests: 0,
      errorsCount: 0,
      lastError: null,
      cooldownUntil: 0,
      lastUsed: null,
    }));

    console.log(`🤖 GeminiPoolManager initialized with ${this.keys.length} API key(s). Detected env variables: [${this.detectedEnvNames.join(', ')}]`);
  }

  maskKey(key) {
    if (!key || key.length < 8) return '****';
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  }

  /**
   * Selects the best available key (least active requests, not in cooldown)
   */
  acquireKey() {
    const now = Date.now();

    // Recover keys whose cooldown period has passed
    this.keys.forEach(k => {
      if (k.status === 'rate_limited' && k.cooldownUntil <= now) {
        k.status = 'active';
        k.cooldownUntil = 0;
      }
    });

    const availableKeys = this.keys.filter(k => k.status === 'active');

    if (availableKeys.length === 0) {
      // If all are rate limited, find the one with the shortest remaining cooldown
      const soonestKey = [...this.keys].sort((a, b) => a.cooldownUntil - b.cooldownUntil)[0];
      const waitMs = Math.max(0, (soonestKey?.cooldownUntil || now) - now);
      throw new Error(`All Gemini API keys are currently rate-limited. Retry in ${Math.ceil(waitMs / 1000)}s.`);
    }

    // Pick key with least active requests
    availableKeys.sort((a, b) => a.activeRequests - b.activeRequests);
    const chosen = availableKeys[0];

    chosen.activeRequests += 1;
    chosen.totalRequests += 1;
    chosen.lastUsed = new Date().toISOString();

    return {
      keyId: chosen.id,
      rawKey: chosen.rawKey,
      client: new GoogleGenAI({ apiKey: chosen.rawKey }),
    };
  }

  releaseKey(keyId, success = true, error = null) {
    const keyObj = this.keys.find(k => k.id === keyId || k.rawKey === keyId);
    if (!keyObj) return;

    keyObj.activeRequests = Math.max(0, keyObj.activeRequests - 1);

    if (success) {
      keyObj.errorsCount = 0;
    } else if (error) {
      keyObj.errorsCount += 1;
      keyObj.lastError = error.message || String(error);

      // Check if it's a Rate Limit (429) or Quota error
      const errStr = String(error).toLowerCase();
      if (errStr.includes('429') || errStr.includes('quota') || errStr.includes('rate limit')) {
        keyObj.status = 'rate_limited';
        keyObj.cooldownUntil = Date.now() + 60 * 1000; // 60s cooldown
        console.warn(`⚠️ Gemini Key ${keyObj.maskedKey} hit rate-limit. Cooldown for 60s.`);
      } else if (errStr.includes('403') || errStr.includes('api_key_invalid')) {
        keyObj.status = 'exhausted';
        console.error(`🚨 Gemini Key ${keyObj.maskedKey} invalid or expired.`);
      }
    }
  }

  /**
   * Returns sanitized statistics for the Admin Panel
   */
  getPoolStatus() {
    if (this.keys.length === 0) {
      this.initPool();
    }
    const now = Date.now();
    return {
      keys: this.keys.map(k => ({
        id: k.id,
        maskedKey: k.maskedKey,
        status: k.status,
        activeRequests: k.activeRequests,
        totalRequests: k.totalRequests,
        errorsCount: k.errorsCount,
        lastError: k.lastError,
        cooldownSecondsRemaining: Math.max(0, Math.ceil((k.cooldownUntil - now) / 1000)),
        lastUsed: k.lastUsed,
      })),
      totalKeys: this.keys.length,
      detectedEnvNames: this.detectedEnvNames || []
    };
  }

  addKey(newKey) {
    if (!newKey || this.keys.some(k => k.rawKey === newKey)) {
      throw new Error('Key is empty or already in the pool.');
    }
    const keyEntry = {
      id: `key_${this.keys.length + 1}`,
      rawKey: newKey,
      maskedKey: this.maskKey(newKey),
      status: 'active',
      activeRequests: 0,
      totalRequests: 0,
      errorsCount: 0,
      lastError: null,
      cooldownUntil: 0,
      lastUsed: null,
    };
    this.keys.push(keyEntry);
    this.saveStoredKeys(this.keys);
    return keyEntry;
  }

  removeKey(idOrMasked) {
    const index = this.keys.findIndex(k => k.id === idOrMasked || k.maskedKey === idOrMasked);
    if (index !== -1) {
      const removed = this.keys.splice(index, 1);
      this.saveStoredKeys(this.keys);
      return removed[0];
    }
    return null;
  }
}

export const geminiPool = new GeminiPoolManager();
export default geminiPool;
