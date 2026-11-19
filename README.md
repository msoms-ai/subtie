# 🎬 Subtie AI — Enterprise Anime Fansub & Subtitle Translation Platform
> **Release:** V2.1 Enterprise Operations Center & Distributed Microservices  
> **Production Host:** `https://subtie.msoms.ai`  
> **Architecture:** Distributed BullMQ 6 + Redis 7.2 + SQLite WAL + 11-Key Gemini Pool + Cloudflare R2 Vault  

---

## 📌 Overview

**Subtie AI** is a collaborative platform tailored for anime fan translation groups (*fansubbers*). It streamlines the end-to-end fansubbing lifecycle: Japanese audio transcription, AI-assisted Japanese-to-Arabic/English translation, character entity normalization, on-screen visual sign OCR, and multi-track ASS/SRT subtitle formatting.

With the **V2.1 Admin Panel & Distributed Microservices** milestone, Subtie transitions into a high-concurrency, fault-tolerant enterprise architecture capable of ingesting dozens of concurrent gigabyte-scale videos without pipeline stalls, process bottlenecks, or rate-limit exhaustion.

---

## 🏗️ System Architecture (8 Tiers)

```
[ Tier 1: Client Web UI ] (React 19, Socket.io, Tailwind CSS, Vite)
           │ (HTTPS / WSS)
[ Tier 2: Edge & Proxy ] (Cloudflare CDN + Nginx / Plesk Reverse Proxy :443)
           │ (Reverse Proxy :3001)
[ Tier 3: API Gateway & Auth Guard ] (Express 4.21, Socket.io Server, RBAC)
           │ 
    ┌──────┴──────────────────────────┐
    ▼                                 ▼
[ Tier 4: Redis In-Memory Bus ]    [ Tier 7: Dual Persistence ]
(Port 6380, BullMQ Job Queue)      (SQLite 3.31 WAL Engine + Atomic JSON Store)
    │
    ▼
[ Tier 5: Autonomous Worker Pool ] (Subtie-Worker Daemon, FFmpeg, Audio Slicer)
    │
    ├─────────────────────────────────┐
    ▼                                 ▼
[ Tier 6: Multi-Key Gemini AI Pool ] [ Tier 8: Dual Storage Vault ]
(11-Key Round-Robin, ~165 RPM Pool)  (Local NVMe Chunks + Cloudflare R2 Bucket)
```

1. **Client Browser Tier**: React 19 single-page application with real-time Socket.io and SSE streaming.
2. **Edge Proxy**: Cloudflare CDN terminating TLS and caching static assets; reverse proxies API requests to Port 3001.
3. **API Gateway & Auth Guard**: Express.js server managing authentication, session state, route dispatching, and socket broadcasting.
4. **Queue & Message Bus**: Redis 7.2 running on dedicated port 6380, managing BullMQ distributed job queues with atomic locks.
5. **Autonomous Worker Core**: Dedicated PM2 process (`subtie-worker`) executing video demuxing, audio chunking, and pipeline stages.
6. **AI Intelligence Cluster**: 11-key Google GenAI key pool orchestrating high-concurrency calls without triggering HTTP 429 quota limits.
7. **Dual-Engine Persistence**: SQLite 3.31 in Write-Ahead Logging (WAL) mode for low-latency queries paired with atomic JSON snapshots.
8. **Dual Storage Architecture**: Local high-speed NVMe storage for transient chunk processing backed by Cloudflare R2 for long-term cloud persistence.

---

## 🛡️ V2.1 Admin Operations Center

The V2.1 Admin Panel is a dedicated, full-screen operations center with **100% real live data and zero mock/dummy fallback**. If any service or tier is unreachable, it explicitly indicates its offline error state.

### 1. 🌐 3D Isometric System Topology
- Interactive perspective view visualizing the 8 distributed tiers.
- Real-time animated data-bus streams reflecting active BullMQ workloads and socket events.
- **Click-to-Inspect Telemetry Drawer**: Clicking any tier displays real host metrics: PID, memory (RSS/Heap), uptime, client connections, and quick-action buttons.

### 2. ⚡ BullMQ & Redis Queue Control Center
- Live queue telemetry: Active, Waiting, Completed, Failed, and Delayed counters.
- **Queue Controls**: Pause all processing, resume queue, clean completed/failed jobs.
- **Atomic Job Actions**: Per-job controls to Retry failed jobs, Promote waiting jobs, or Remove jobs directly from Redis.

### 3. 🛡️ Activities & Stuck Tasks Sentinel
- Real-time radar detecting stalled video pipelines (>15 minutes of inactivity) and zero-peer WebTorrent downloads.
- **One-Click Auto-Heal All**: Automatically cleans dead BullMQ lock claims, re-enqueues stalled tasks, and marks unrecoverable jobs.
- Manual intervention controls per stuck task: Re-enqueue, Mark Failed, or Cancel Torrent.

### 4. 🤖 Gemini AI 11-Key Cluster Pool
- Granular control over the 11-key Google GenAI cluster.
- **The 11-Key Distribution Architecture**: Explains why 11 keys are used instead of 1. With Google's 15 RPM limit per key and 10–12 audio chunks per anime episode, a single key triggers `HTTP 429 Resource Exhausted`. The 11-key pool yields **~165 RPM aggregate capacity** with automatic cooldown isolation.
- **Live Ping Testing**: Real round-trip API ping test measuring latency in milliseconds and validating the model reply (`PONG`).
- Dynamic key addition, deletion, and primary/fallback model selector (`gemini-3.8-flash`, `gemini-flash-latest`, `gemini-pro-latest`).

### 5. 👥 Users & RBAC Roles CRUD
- Manage accounts with role-based permissions: `Admin`, `Auditor`, `User`.
- **Minutes Balance Adjustments**: Credit or deduct minutes with mandatory audit trail reasons.
- Account suspension/unsuspension toggle and permanent account deletion.

### 6. 🎬 Video Projects & Assets Catalog
- Full catalog with search by series, episode, user ID, or status.
- **Purge Local Raw Video**: Allows administrators to safely delete multi-gigabyte local raw video files once transcription is complete and files are mirrored to Cloudflare R2, instantly reclaiming tens of gigabytes of NVMe disk space while preserving subtitles.
- Direct Cloudflare R2 synchronization and pipeline re-run triggers.

### 7. 📁 Categories & Series Management
- Manage anime series folders and taxonomies.
- Real-time project and completion counts per series.
- Category rename propagation across all associated projects.

### 8. 🗄️ Storage Explorer (Local NVMe & Cloudflare R2)
- **Local NVMe Tab**: Explores `/server/uploads`, `/server/data/subtitles`, and `/server/data/backups`.
- **Cloudflare R2 Tab**: Lists live S3 objects in bucket `subtie-vault`, object sizes, timestamps, and direct CDN URLs.
- Delete object actions for both storage layers.

### 9. 🧹 Garbage Collector & Space Reclaimer
- Comprehensive scanner identifying orphan files:
  - Audio chunks from completed projects.
  - Unlinked project directories.
  - Orphan subtitle exports.
  - Transient atomic temporary buffers.
- **Safe Execution**: One-click cleanup reclaiming multi-gigabytes of disk space with zero risk to active or completed user projects.

### 10. 🩺 System Diagnostics & PM2 Process Supercluster
- Live status of PM2 daemons: `subtie` (Gateway), `subtie-worker` (Pipeline), `subtie-watchdog` (Watchdog).
- Real restart controls per PM2 microservice.
- **SQLite Database Health**: Total database size, PRAGMA integrity verification, and **SQLite VACUUM** optimization button.
- Host hardware gauges: Load averages (1m, 5m, 15m), CPU cores, RAM allocation, and root partition NVMe usage (`df -h /`).

### 11. ⚙️ Global Cluster Settings
- Atomic configuration editor for primary AI models, fallback tiers, vision OCR models, worker concurrency, and upload limits.

---

## 🔌 Dedicated Admin REST API Reference

All routes require authentication via header `x-user-id` belonging to an `Admin` user.

| Endpoint | Method | Description |
|---|---|---|
| `/api/admin/topology` | `GET` | Returns 8-tier system telemetry, Redis info, gateway stats, and cluster health |
| `/api/admin/queue/jobs` | `GET` | Returns BullMQ active, waiting, completed, failed, and delayed jobs |
| `/api/admin/queue/pause` | `POST` | Atomically pauses the BullMQ queue |
| `/api/admin/queue/resume` | `POST` | Resumes BullMQ queue processing |
| `/api/admin/queue/clean` | `POST` | Cleans completed or failed jobs with customizable grace period |
| `/api/admin/queue/job/:id/action` | `POST` | Executes `retry`, `promote`, or `remove` on a specific BullMQ job |
| `/api/admin/sentinel/stuck-tasks` | `GET` | Scans for stalled pipelines (>15m) and zero-peer torrents |
| `/api/admin/sentinel/action` | `POST` | Executes auto-heal or task-specific recovery action |
| `/api/admin/gemini/keys` | `GET` | Returns all 11+ configured Gemini API keys with usage stats |
| `/api/admin/gemini/keys` | `POST` | Adds a new Gemini API key to the cluster |
| `/api/admin/gemini/keys/:id` | `DELETE` | Removes a Gemini key from the pool |
| `/api/admin/gemini/keys/:id/test` | `POST` | Performs live round-trip ping test returning ms latency |
| `/api/admin/users` | `GET` | Returns all registered users with project stats and minute balances |
| `/api/admin/users/:id/role` | `PUT` | Updates user role (`Admin`, `Auditor`, `User`) |
| `/api/admin/users/:id/credit` | `POST` | Adjusts user minute balance with audit justification |
| `/api/admin/users/:id/suspend` | `PUT` | Toggles account suspension status |
| `/api/admin/users/:id` | `DELETE` | Permanently deletes user and associated content |
| `/api/admin/projects` | `GET` | Returns all projects with processing stage and R2 status |
| `/api/admin/projects/:id/action` | `POST` | Triggers `purge_local_raw`, `sync_r2`, or `rerun_pipeline` |
| `/api/admin/projects/:id` | `DELETE` | Deletes a project and its subtitle files |
| `/api/admin/categories` | `GET` | Lists series categories with episode counts |
| `/api/admin/categories/:name` | `PUT` | Renames a category across all projects |
| `/api/admin/categories/:name` | `DELETE` | Deletes a category |
| `/api/admin/storage/browse` | `GET` | Explores host NVMe directories |
| `/api/admin/storage/r2/objects` | `GET` | Queries Cloudflare R2 bucket objects |
| `/api/admin/storage/r2/object` | `DELETE` | Deletes an object from Cloudflare R2 |
| `/api/admin/garbage/scan` | `GET` | Scans for reclaimable audio chunks and orphan temp files |
| `/api/admin/garbage/clean` | `POST` | Executes safe deletion of detected orphan files |
| `/api/admin/diagnostics` | `GET` | Returns PM2 process list, host CPU/RAM, and SQLite integrity |
| `/api/admin/diagnostics/pm2/:name/restart` | `POST` | Restarts a specific PM2 service |
| `/api/admin/diagnostics/sqlite/vacuum` | `POST` | Executes SQLite database defragmentation (VACUUM) |
| `/api/admin/settings` | `GET` | Returns global cluster configuration |
| `/api/admin/settings` | `PUT` | Saves global configuration atomically |

---

## 🧪 Automated Verification & Test Suite

Subtie includes an end-to-end integration test suite verifying all 28 admin endpoints against the live production backend:

```bash
# Run test suite
node test_admin_suite.js
```

### Verification Output:
```
🚀 [Subtie V2.1 Admin Panel] Running Comprehensive Test Suite...

  ⏳ GET /api/admin/topology returns real 8-tier telemetry... ✅ PASS
  ⏳ GET /api/admin/queue/jobs returns live BullMQ queue data... ✅ PASS
  ⏳ POST /api/admin/queue/pause & resume toggles BullMQ queue state... ✅ PASS
  ⏳ GET /api/admin/sentinel/stuck-tasks returns radar analysis... ✅ PASS
  ⏳ GET /api/admin/gemini/keys returns configured API key cluster... ✅ PASS
  ⏳ POST /api/admin/gemini/keys/key_1/test performs real Google GenAI ping... ✅ PASS
  ⏳ GET /api/admin/users returns user roster with roles and balances... ✅ PASS
  ⏳ GET /api/admin/projects returns project list with R2 sync status... ✅ PASS
  ⏳ GET /api/admin/categories returns series taxonomy... ✅ PASS
  ⏳ GET /api/admin/storage/r2/objects connects to Cloudflare R2 bucket... ✅ PASS
  ⏳ GET /api/admin/garbage/scan detects orphan files and space to reclaim... ✅ PASS
  ⏳ GET /api/admin/diagnostics returns PM2 processes and host metrics... ✅ PASS
  ⏳ GET /api/admin/settings returns cluster settings... ✅ PASS
  ⏳ GET /api/admin/topology denies non-admin request with 403... ✅ PASS

========================================
Test Results: 14 PASSED | 0 FAILED
========================================
```

---

## 🚀 Deployment Instructions

### Prerequisites
- Node.js 20+
- Redis 7+ running on port 6380
- PM2 process manager
- Cloudflare R2 S3-compatible credentials
- Google GenAI API Keys (11 keys configured via `GEMINI_API_KEYS`)

### Production Build & Launch
```bash
# 1. Install dependencies
npm install

# 2. Compile React frontend
npm run build

# 3. Restart PM2 microservices
npx pm2 restart subtie
npx pm2 restart subtie-worker
npx pm2 restart subtie-watchdog
```

---

## 📄 License & Attribution
Proprietary fansub software developed for **MSOMS AI** (`msoms.ai`). All rights reserved.
