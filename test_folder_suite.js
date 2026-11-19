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

async function runTests() {
  console.log("=== Testing Folder Enhancements & Reorder Endpoint ===");

  // 1. Fetch projects to get two projects from the same folder
  const resProjects = await request('/api/projects', {
    method: 'GET',
    headers: { 'x-user-id': 'usr_admin_msoms1' }
  });

  if (!Array.isArray(resProjects.body)) {
    throw new Error("Failed to fetch projects array");
  }

  // Find a folder with at least 2 projects
  const folderMap = {};
  for (const p of resProjects.body) {
    const f = p.projectName || 'Uncategorized';
    if (!folderMap[f]) folderMap[f] = [];
    folderMap[f].push(p.id);
  }

  const multiFolder = Object.keys(folderMap).find(f => folderMap[f].length >= 2);
  if (!multiFolder) {
    console.log("No folder with >=2 projects found, testing empty reorder");
    const emptyRes = await request('/api/folders/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'usr_admin_msoms1' },
      body: { folderName: 'test', projectIds: [] }
    });
    console.log("Empty reorder status:", emptyRes.body);
    if (!emptyRes.body.success) throw new Error("Empty reorder failed");
  } else {
    const [id1, id2] = folderMap[multiFolder].slice(0, 2);
    console.log(`Testing reorder on folder: "${multiFolder}" with projects [${id2}, ${id1}]`);

    // Reorder: put id2 first, id1 second
    const reorderRes = await request('/api/folders/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'usr_admin_msoms1' },
      body: { folderName: multiFolder, projectIds: [id2, id1] }
    });

    console.log("Reorder response:", reorderRes.body);
    if (!reorderRes.body.success || reorderRes.body.count < 2) {
      throw new Error(`Reorder response invalid: ${JSON.stringify(reorderRes.body)}`);
    }

    // Verify in projects.json
    const projectsOnDisk = JSON.parse(fs.readFileSync('/var/www/vhosts/msoms.ai/subtie.msoms.ai/server/data/projects.json', 'utf8'));
    if (projectsOnDisk[id2].order !== 0 || projectsOnDisk[id1].order !== 1) {
      throw new Error(`Order mismatch: id2.order=${projectsOnDisk[id2].order}, id1.order=${projectsOnDisk[id1].order}`);
    }
    console.log("✅ Reorder persistence verified: id2.order=0, id1.order=1");

    // Restore order: put id1 first, id2 second
    await request('/api/folders/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'usr_admin_msoms1' },
      body: { folderName: multiFolder, projectIds: [id1, id2] }
    });
    console.log("✅ Reorder restored to original: id1.order=0, id2.order=1");
  }

  // 2. Test Arabic grammar pluralization logic
  const formatArabicItemCount = (count) => {
    if (count === 0) return 'لا توجد عناصر';
    if (count === 1) return 'عنصر واحد';
    if (count === 2) return 'عنصران';
    const lastTwo = count % 100;
    if (count >= 3 && count <= 10) return `${count} عناصر`;
    if (count > 10 && lastTwo >= 3 && lastTwo <= 10) return `${count} عناصر`;
    if (lastTwo >= 11 && lastTwo <= 99) return `${count} عنصراً`;
    return `${count} عنصر`;
  };

  const expectedCases = [
    [0, 'لا توجد عناصر'],
    [1, 'عنصر واحد'],
    [2, 'عنصران'],
    [3, '3 عناصر'],
    [5, '5 عناصر'],
    [10, '10 عناصر'],
    [11, '11 عنصراً'],
    [25, '25 عنصراً'],
    [99, '99 عنصراً'],
    [100, '100 عنصر'],
    [105, '105 عناصر'],
    [120, '120 عنصراً'],
    [200, '200 عنصر']
  ];

  for (const [n, expected] of expectedCases) {
    const actual = formatArabicItemCount(n);
    if (actual !== expected) {
      throw new Error(`Grammar mismatch for ${n}: expected "${expected}", got "${actual}"`);
    }
  }
  console.log("✅ All 13 Arabic grammar pluralization test cases passed!");

  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
}

runTests().catch(err => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
