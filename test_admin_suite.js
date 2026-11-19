import assert from 'assert';

const BASE_URL = 'http://127.0.0.1:3001';
const ADMIN_HEADERS = {
  'Content-Type': 'application/json',
  'x-user-id': 'usr_admin_msoms1'
};

async function runTests() {
  console.log('🚀 [Subtie V2.1 Admin Panel] Running Comprehensive Test Suite...\n');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`  ⏳ ${name}... `);
      await fn();
      console.log('✅ PASS');
      passed++;
    } catch (err) {
      console.log(`❌ FAIL: ${err.message}`);
      failed++;
    }
  }

  // 1. Topology
  await test('GET /api/admin/topology returns real 8-tier telemetry', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/topology`, { headers: ADMIN_HEADERS });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.nodes.gateway.pid > 0);
    assert.ok(data.nodes.redis.status === 'online');
    const geminiNode = data.nodes.geminiPool || data.nodes.gemini || data.nodes.geminiCluster;
    assert.ok(geminiNode && geminiNode.totalKeys >= 11);
    assert.ok(data.nodes.storageR2 !== undefined);
  });

  // 2. Queue Jobs
  await test('GET /api/admin/queue/jobs returns live BullMQ queue data', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/queue/jobs`, { headers: ADMIN_HEADERS });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.counts !== undefined);
    assert.ok(typeof data.isPaused === 'boolean');
  });

  // 3. Queue Pause & Resume Toggle
  await test('POST /api/admin/queue/pause & resume toggles BullMQ queue state', async () => {
    const pauseRes = await fetch(`${BASE_URL}/api/admin/queue/pause`, { method: 'POST', headers: ADMIN_HEADERS });
    const pauseData = await pauseRes.json();
    assert.strictEqual(pauseData.success, true);
    assert.strictEqual(pauseData.isPaused, true);

    const resumeRes = await fetch(`${BASE_URL}/api/admin/queue/resume`, { method: 'POST', headers: ADMIN_HEADERS });
    const resumeData = await resumeRes.json();
    assert.strictEqual(resumeData.success, true);
    assert.strictEqual(resumeData.isPaused, false);
  });

  // 4. Sentinel Stuck Tasks
  await test('GET /api/admin/sentinel/stuck-tasks returns radar analysis', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/sentinel/stuck-tasks`, { headers: ADMIN_HEADERS });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.stuckProjects));
    assert.ok(Array.isArray(data.stuckTorrents));
  });

  // 5. Gemini 11-Key Cluster
  await test('GET /api/admin/gemini/keys returns configured API key cluster', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/gemini/keys`, { headers: ADMIN_HEADERS });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.keys.length >= 11);
    assert.ok(data.keys[0].maskedKey.includes('...'));
  });

  // 6. Live Key Ping Test
  await test('POST /api/admin/gemini/keys/key_1/test performs real Google GenAI ping', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/gemini/keys/key_1/test`, { method: 'POST', headers: ADMIN_HEADERS });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.status, 'valid');
    assert.ok(data.latencyMs > 0);
    assert.ok(data.reply.length > 0);
  });

  // 7. Users RBAC
  await test('GET /api/admin/users returns user roster with roles and balances', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/users`, { headers: ADMIN_HEADERS });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.users.length > 0);
    const adminUser = data.users.find(u => u.role === 'Admin');
    assert.ok(adminUser);
  });

  // 8. Projects Catalog
  await test('GET /api/admin/projects returns project list with R2 sync status', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/projects`, { headers: ADMIN_HEADERS });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.projects));
  });

  // 9. Categories
  await test('GET /api/admin/categories returns series taxonomy', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/categories`, { headers: ADMIN_HEADERS });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.categories.length > 0);
  });

  // 10. Storage R2
  await test('GET /api/admin/storage/r2/objects connects to Cloudflare R2 bucket', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/storage/r2/objects`, { headers: ADMIN_HEADERS });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.bucket, 'subtie-vault');
    assert.ok(data.objects.length > 0);
  });

  // 11. Garbage Scan
  await test('GET /api/admin/garbage/scan detects orphan files and space to reclaim', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/garbage/scan`, { headers: ADMIN_HEADERS });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.scan.totalCount > 0);
    assert.ok(data.scan.totalBytes > 0);
  });

  // 12. Diagnostics
  await test('GET /api/admin/diagnostics returns PM2 processes and host metrics', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/diagnostics`, { headers: ADMIN_HEADERS });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.pm2.length >= 3);
    assert.ok(data.host.totalMemBytes > 0);
    assert.strictEqual(data.sqlite.integrity, 'ok');
  });

  // 13. Settings
  await test('GET /api/admin/settings returns cluster settings', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/settings`, { headers: ADMIN_HEADERS });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.settings.geminiModel);
  });

  // 14. RBAC Security Guard: Non-admin is blocked with 403
  await test('GET /api/admin/topology denies non-admin request with 403', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/topology`, { 
      headers: { 'x-user-id': 'usr_dummy_unauthorized' } 
    });
    assert.strictEqual(res.status, 403);
  });

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} PASSED | ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();
