import http from 'http';
import fs from 'fs';

const BASE_URL = 'http://127.0.0.1:3001';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function testTitleEndpoint() {
  console.log("=== Testing Title Permissions & Update Endpoint ===");

  const projects = JSON.parse(fs.readFileSync('/var/www/vhosts/msoms.ai/subtie.msoms.ai/server/data/projects.json', 'utf8'));
  const sampleProject = Object.values(projects).find(p => p.ownerId && p.ownerId !== 'usr_admin_msoms1') || Object.values(projects)[0];
  
  const pid = sampleProject.id;
  const ownerId = sampleProject.ownerId || 'usr_guest';
  const originalTitle = sampleProject.mediaTitle;
  console.log(`Using project ${pid}, owner: ${ownerId}, original title: "${originalTitle}"`);

  // 1. Test forbidden: Non-owner non-admin user
  const nonOwnerRes = await request(`/api/project/${pid}/title`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': 'usr_intruder_fake_999' },
    body: { mediaTitle: 'Hacked Title' }
  });
  console.log("Non-owner attempt status:", nonOwnerRes.status, nonOwnerRes.body);
  if (nonOwnerRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for non-owner, got ${nonOwnerRes.status}`);
  }
  console.log("✅ Non-owner correctly blocked with 403 Forbidden");

  // 2. Test empty title: Rejected with 400
  const emptyRes = await request(`/api/project/${pid}/title`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': ownerId },
    body: { mediaTitle: '   ' }
  });
  console.log("Empty title attempt status:", emptyRes.status, emptyRes.body);
  if (emptyRes.status !== 400) {
    throw new Error(`Expected 400 Bad Request for empty title, got ${emptyRes.status}`);
  }
  console.log("✅ Empty title correctly rejected with 400 Bad Request");

  // 3. Test owner update: Success
  const newTestTitle = originalTitle + " (Renamed Test)";
  const ownerRes = await request(`/api/project/${pid}/title`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': ownerId },
    body: { mediaTitle: newTestTitle }
  });
  console.log("Owner update status:", ownerRes.status, ownerRes.body);
  if (ownerRes.status !== 200 || !ownerRes.body.success || ownerRes.body.mediaTitle !== newTestTitle) {
    throw new Error(`Expected 200 Success for owner, got ${ownerRes.status}`);
  }
  console.log("✅ Owner successfully updated title");

  // 4. Test admin update (restore original title): Success
  const adminRes = await request(`/api/project/${pid}/title`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': 'usr_admin_msoms1' },
    body: { mediaTitle: originalTitle }
  });
  console.log("Admin update status:", adminRes.status, adminRes.body);
  if (adminRes.status !== 200 || !adminRes.body.success || adminRes.body.mediaTitle !== originalTitle) {
    throw new Error(`Expected 200 Success for admin, got ${adminRes.status}`);
  }
  console.log("✅ Admin successfully restored original title");

  console.log("🎉 ALL TITLE ENDPOINT TESTS PASSED!");
}

testTitleEndpoint().catch(err => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
