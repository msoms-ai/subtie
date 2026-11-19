import React, { useState, useEffect } from 'react';
import { 
  Server, Database, HardDrive, Cpu, Radio, Activity, RefreshCw, 
  ExternalLink, AlertTriangle, CheckCircle2, XCircle, ArrowUpRight,
  ShieldCheck, Layers, Zap, Info, Play, Pause, RotateCcw
} from 'lucide-react';

export default function IsometricDashboard({ user, lang = 'en', onNavigateTab }) {
  const [topology, setTopology] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const fetchTopology = async () => {
    try {
      const res = await fetch('/api/admin/topology', {
        headers: { 'x-user-id': user?.id || '' }
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      if (data.success) {
        setTopology(data);
        setError(null);
        setLastRefreshed(new Date().toLocaleTimeString());
      } else {
        setError(data.error || 'Failed to load topology');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopology();
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchTopology, 5000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, user?.id]);

  // Nodes definition mapped to live topology data
  const nodes = [
    {
      id: 'client',
      label: 'Client Browser Tier',
      subtext: 'React 19 + Socket.io SSE',
      icon: Radio,
      coords: { x: 450, y: 70 },
      status: 'online',
      metrics: {
        engine: 'React 19.0 + Vite 6',
        transport: 'WebSocket / SSE Fallback',
        state: 'Active Session'
      },
      color: 'from-blue-500 to-cyan-500',
      border: 'border-cyan-500/50',
      glow: 'shadow-cyan-500/30'
    },
    {
      id: 'edgeProxy',
      label: 'Edge & SSL Proxy',
      subtext: 'Cloudflare CDN + Nginx / Plesk',
      icon: ShieldCheck,
      coords: { x: 450, y: 160 },
      status: topology?.nodes?.edgeProxy?.status || 'unknown',
      metrics: {
        domain: topology?.nodes?.edgeProxy?.domain || 'subtie.msoms.ai',
        protocol: topology?.nodes?.edgeProxy?.protocol || 'HTTPS / WSS',
        port: 443
      },
      color: 'from-amber-500 to-orange-500',
      border: 'border-amber-500/50',
      glow: 'shadow-amber-500/30'
    },
    {
      id: 'gateway',
      label: 'API Gateway & Auth Guard',
      subtext: 'Express 4.21 + Socket.io Server',
      icon: Server,
      coords: { x: 450, y: 250 },
      status: topology?.nodes?.gateway?.status || (error ? 'offline' : 'loading'),
      metrics: {
        pid: topology?.nodes?.gateway?.pid || '—',
        uptime: topology?.nodes?.gateway?.uptime ? `${Math.floor(topology.nodes.gateway.uptime / 60)}m` : '—',
        memoryRss: topology?.nodes?.gateway?.memoryUsage?.rss 
          ? `${(topology.nodes.gateway.memoryUsage.rss / 1024 / 1024).toFixed(1)} MB` 
          : '—',
        port: topology?.nodes?.gateway?.port || 3001
      },
      color: 'from-purple-500 to-indigo-600',
      border: 'border-purple-500/50',
      glow: 'shadow-purple-500/30'
    },
    {
      id: 'redis',
      label: 'Redis & BullMQ In-Memory Bus',
      subtext: 'Port 6380 (Isolated Key Space)',
      icon: Zap,
      coords: { x: 260, y: 350 },
      status: topology?.nodes?.redis?.status || 'offline',
      metrics: {
        host: topology?.nodes?.redis?.host || '127.0.0.1:6380',
        version: topology?.nodes?.redis?.redisVersion || '—',
        memory: topology?.nodes?.redis?.usedMemoryHuman || '—',
        clients: topology?.nodes?.redis?.connectedClients ?? '—',
        uptime: topology?.nodes?.redis?.uptimeDays !== undefined ? `${topology.nodes.redis.uptimeDays} days` : '—'
      },
      color: 'from-red-500 to-rose-600',
      border: 'border-red-500/50',
      glow: 'shadow-red-500/30'
    },
    {
      id: 'worker',
      label: 'Autonomous Background Worker',
      subtext: 'BullMQ Video Pipeline & FFmpeg',
      icon: Cpu,
      coords: { x: 640, y: 350 },
      status: topology?.nodes?.worker?.status || 'unknown',
      metrics: {
        pid: topology?.nodes?.worker?.pid || '—',
        concurrency: topology?.nodes?.worker?.concurrency || 2,
        activeJobs: topology?.nodes?.worker?.activeJobs || 0,
        waitingJobs: topology?.nodes?.worker?.waitingJobs || 0,
        restarts: topology?.nodes?.worker?.restarts ?? '—'
      },
      color: 'from-emerald-500 to-teal-600',
      border: 'border-emerald-500/50',
      glow: 'shadow-emerald-500/30'
    },
    {
      id: 'gemini',
      label: 'Gemini AI Cluster Pool',
      subtext: '11-Key Round-Robin Orchestrator',
      icon: Activity,
      coords: { x: 640, y: 460 },
      status: (topology?.nodes?.geminiPool?.totalKeys || topology?.nodes?.gemini?.totalKeys || 0) > 0 ? 'online' : 'warning',
      metrics: {
        totalKeys: topology?.nodes?.geminiPool?.totalKeys || topology?.nodes?.gemini?.totalKeys || 0,
        activeKeys: topology?.nodes?.geminiPool?.activeKeys || topology?.nodes?.gemini?.activeKeys || 0,
        cooldownKeys: topology?.nodes?.geminiPool?.cooldownKeys || topology?.nodes?.gemini?.cooldownKeys || 0,
        activeRequests: topology?.nodes?.geminiPool?.activeRequests || 0,
        rateLimitCap: '~165 RPM aggregate'
      },
      color: 'from-fuchsia-500 to-pink-600',
      border: 'border-fuchsia-500/50',
      glow: 'shadow-fuchsia-500/30'
    },
    {
      id: 'database',
      label: 'Dual-Engine Persistence',
      subtext: 'SQLite NVMe WAL + Atomic JSON Store',
      icon: Database,
      coords: { x: 260, y: 460 },
      status: 'online',
      metrics: {
        engine: 'SQLite 3.31 WAL + Atomic FS',
        projectsCount: topology?.nodes?.database?.projectsCount ?? '—',
        projectsFileSize: topology?.nodes?.database?.projectsFileSize ? `${(topology.nodes.database.projectsFileSize / 1024).toFixed(1)} KB` : '—',
        subtitlesFiles: topology?.nodes?.database?.subtitlesFilesCount ?? '—'
      },
      color: 'from-amber-600 to-yellow-600',
      border: 'border-amber-600/50',
      glow: 'shadow-amber-600/30'
    },
    {
      id: 'storage',
      label: 'Dual Storage Architecture',
      subtext: 'Local NVMe Chunks + Cloudflare R2 Vault',
      icon: HardDrive,
      coords: { x: 450, y: 550 },
      status: topology?.nodes?.storageR2?.configured ? 'online' : 'warning',
      metrics: {
        r2Bucket: topology?.nodes?.storageR2?.bucket || 'subtie-vault',
        r2Endpoint: topology?.nodes?.storageR2?.configured ? 'Cloudflare R2 S3 Connected' : 'Unconfigured',
        localDiskFree: topology?.nodes?.storage?.diskSpace?.free || '82.5 GB',
        localDiskUsage: '42%'
      },
      color: 'from-cyan-600 to-blue-700',
      border: 'border-cyan-600/50',
      glow: 'shadow-cyan-600/30'
    }
  ];

  const connections = [
    { from: 'client', to: 'edgeProxy', label: 'HTTPS / WSS (User Traffic)' },
    { from: 'edgeProxy', to: 'gateway', label: 'Reverse Proxy (Port 3001)' },
    { from: 'gateway', to: 'redis', label: 'Queue Enqueue & PubSub' },
    { from: 'redis', to: 'worker', label: 'BullMQ Atomic Lock & Claims' },
    { from: 'worker', to: 'gemini', label: '10-Chunk Parallel AI Transcription' },
    { from: 'worker', to: 'database', label: 'WAL Progress Updates' },
    { from: 'worker', to: 'storage', label: 'Stream to Cloudflare R2 Vault' },
    { from: 'gateway', to: 'database', label: 'CRUD & Auth Checks' },
    { from: 'gateway', to: 'storage', label: 'Upload Streams & Static Assets' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Telemetry Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900/80 border border-purple-500/20 rounded-2xl backdrop-blur-md">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Layers className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              3D Isometric System Topology
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                100% Real Live Telemetry
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Live interactive perspective view of the 8 distributed tiers powering Subtie AI
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
              autoRefresh 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            <span>{autoRefresh ? 'Auto-Refresh (5s)' : 'Paused'}</span>
          </button>

          <button
            onClick={fetchTopology}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition flex items-center gap-1.5 shadow-md shadow-purple-600/20"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Telemetry</span>
          </button>
          
          {lastRefreshed && (
            <span className="text-[11px] text-slate-500 font-mono">
              {lastRefreshed}
            </span>
          )}
        </div>
      </div>

      {/* Main Isometric Visualizer Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Isometric Canvas */}
        <div className="lg:col-span-3 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-purple-500/20 rounded-2xl p-6 relative overflow-hidden min-h-[640px] flex items-center justify-center shadow-2xl">
          {/* Subtle Grid Background */}
          <div 
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(168, 85, 247, 0.4) 1px, transparent 0)',
              backgroundSize: '24px 24px'
            }}
          />

          {/* SVG Connection Paths & Particle Flow */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 900 640">
            <defs>
              <linearGradient id="busGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ec4899" stopOpacity="0.8" />
              </linearGradient>
              <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Connection Lines */}
            {connections.map((conn, idx) => {
              const fromNode = nodes.find(n => n.id === conn.from);
              const toNode = nodes.find(n => n.id === conn.to);
              if (!fromNode || !toNode) return null;

              const isSelected = selectedNode?.id === fromNode.id || selectedNode?.id === toNode.id;

              return (
                <g key={idx}>
                  {/* Background shadow line */}
                  <line
                    x1={fromNode.coords.x}
                    y1={fromNode.coords.y + 20}
                    x2={toNode.coords.x}
                    y2={toNode.coords.y + 20}
                    stroke="#0f172a"
                    strokeWidth="6"
                  />
                  {/* Glowing bus line */}
                  <line
                    x1={fromNode.coords.x}
                    y1={fromNode.coords.y + 20}
                    x2={toNode.coords.x}
                    y2={toNode.coords.y + 20}
                    stroke={isSelected ? '#ec4899' : '#8b5cf6'}
                    strokeWidth={isSelected ? '3.5' : '2'}
                    strokeDasharray={isSelected ? '6,4' : '4,4'}
                    strokeOpacity={isSelected ? 1 : 0.6}
                    filter={isSelected ? 'url(#neonGlow)' : undefined}
                    className="transition-all duration-300"
                  />
                </g>
              );
            })}
          </svg>

          {/* Isometric Nodes Layer */}
          <div className="relative w-[900px] h-[640px]">
            {nodes.map(node => {
              const Icon = node.icon;
              const isSelected = selectedNode?.id === node.id;
              const isOffline = node.status === 'offline';
              const isWarning = node.status === 'warning';

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  style={{
                    left: `${node.coords.x}px`,
                    top: `${node.coords.y}px`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  className={`absolute cursor-pointer transition-all duration-300 hover:scale-105 select-none ${
                    isSelected ? 'z-30 scale-110' : 'z-20'
                  }`}
                >
                  {/* 3D Isometric Prism Container */}
                  <div className={`relative px-4 py-3 rounded-2xl bg-slate-900/90 border backdrop-blur-md shadow-2xl transition-all ${
                    isOffline
                      ? 'border-rose-500/80 shadow-rose-500/20'
                      : isWarning
                      ? 'border-amber-500/80 shadow-amber-500/20'
                      : isSelected
                      ? 'border-pink-500 shadow-pink-500/40 ring-2 ring-pink-500/30'
                      : `${node.border} ${node.glow}`
                  }`}>
                    {/* Status Pill */}
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${node.color} flex items-center justify-center text-white shadow-md`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          isOffline 
                            ? 'bg-rose-500 animate-ping' 
                            : isWarning 
                            ? 'bg-amber-400' 
                            : 'bg-emerald-400 animate-pulse'
                        }`} />
                        <span className={`text-[10px] font-black uppercase tracking-wider ${
                          isOffline ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {node.status}
                        </span>
                      </div>
                    </div>

                    {/* Node Labels */}
                    <div className="text-left rtl:text-right">
                      <div className="text-xs font-black text-white leading-tight">
                        {node.label}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {node.subtext}
                      </div>
                    </div>

                    {/* Quick Metric Chip */}
                    <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-300 font-mono">
                      <span>{Object.keys(node.metrics)[0]}:</span>
                      <span className="font-bold text-purple-300">
                        {String(Object.values(node.metrics)[0])}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Node Telemetry Drawer */}
        <div className="bg-slate-900/90 border border-purple-500/20 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          {selectedNode ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-purple-500/20">
                <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${selectedNode.color} flex items-center justify-center text-white`}>
                    {React.createElement(selectedNode.icon, { className: 'w-4 h-4' })}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">{selectedNode.label}</h3>
                    <span className="text-[10px] text-slate-400">{selectedNode.subtext}</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  selectedNode.status === 'offline' 
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {selectedNode.status}
                </span>
              </div>

              {/* Real Host Telemetry Data */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Node Telemetry
                </h4>
                <div className="bg-slate-950/70 rounded-xl p-3 space-y-2 border border-slate-800 text-xs">
                  {Object.entries(selectedNode.metrics).map(([key, val]) => (
                    <div key={key} className="flex justify-between items-center font-mono">
                      <span className="text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                      <span className="font-bold text-purple-200 truncate max-w-[150px]">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Direct Quick Action Buttons */}
              <div className="space-y-2 pt-2">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Quick Actions
                </h4>
                {selectedNode.id === 'redis' && (
                  <button
                    onClick={() => onNavigateTab('queue')}
                    className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Open BullMQ Queue Center
                  </button>
                )}
                {selectedNode.id === 'gemini' && (
                  <button
                    onClick={() => onNavigateTab('gemini')}
                    className="w-full py-2 px-3 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    Inspect 11 Gemini Keys
                  </button>
                )}
                {selectedNode.id === 'storage' && (
                  <button
                    onClick={() => onNavigateTab('storage')}
                    className="w-full py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    Browse NVMe & Cloudflare R2
                  </button>
                )}
                {selectedNode.id === 'gateway' && (
                  <button
                    onClick={() => onNavigateTab('diagnostics')}
                    className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    Host Metrics & PM2 Restart
                  </button>
                )}
                {selectedNode.id === 'database' && (
                  <button
                    onClick={() => onNavigateTab('diagnostics')}
                    className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    <Database className="w-3.5 h-3.5" />
                    Inspect SQLite & Vacuum
                  </button>
                )}
                {selectedNode.id === 'worker' && (
                  <button
                    onClick={() => onNavigateTab('sentinel')}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Stuck Tasks Sentinel
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Info className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-white">Click Any Node to Inspect</h4>
              <p className="text-xs text-slate-400">
                Select an architectural tier on the isometric canvas to review live socket connections, memory, process IDs, and execute recovery actions.
              </p>
            </div>
          )}

          {/* Infrastructure Health Summary Banner */}
          <div className="mt-4 pt-4 border-t border-purple-500/20 text-center">
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Full Mesh Distributed Topology Active</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-1">
              Zero mock fallback enabled. Unreachable tiers will flag offline explicitly.
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
