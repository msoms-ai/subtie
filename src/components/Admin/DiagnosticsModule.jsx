import React, { useState, useEffect } from 'react';
import { 
  Cpu, Server, Database, HardDrive, RefreshCw, RotateCcw, 
  CheckCircle2, AlertTriangle, ShieldAlert, Zap, Clock, Terminal, Activity 
} from 'lucide-react';

export default function DiagnosticsModule({ user, lang = 'en' }) {
  const [diagData, setDiagData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restartingProcess, setRestartingProcess] = useState({});
  const [vacuuming, setVacuuming] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchDiagnostics = async () => {
    try {
      const res = await fetch('/api/admin/diagnostics', {
        headers: { 'x-user-id': user?.id || '' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      if (data.success) {
        setDiagData(data);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch system diagnostics');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
    const interval = setInterval(fetchDiagnostics, 6000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleRestartProcess = async (name) => {
    if (!window.confirm(`Restart PM2 process "${name}"?`)) return;
    setRestartingProcess(prev => ({ ...prev, [name]: true }));
    try {
      const res = await fetch(`/api/admin/diagnostics/pm2/${name}/restart`, {
        method: 'POST',
        headers: { 'x-user-id': user?.id || '' }
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Process ${name} restarted successfully`);
        setTimeout(fetchDiagnostics, 2000);
      } else {
        showToast(data.error || 'Restart failed', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setRestartingProcess(prev => ({ ...prev, [name]: false }));
    }
  };

  const handleVacuumSqlite = async () => {
    if (!window.confirm('Run SQLite VACUUM operation? This defragments database pages and reclaims disk space.')) return;
    setVacuuming(true);
    try {
      const res = await fetch('/api/admin/diagnostics/sqlite/vacuum', {
        method: 'POST',
        headers: { 'x-user-id': user?.id || '' }
      });
      const data = await res.json();
      if (data.success) {
        showToast(`SQLite VACUUM complete: Freed ${(data.freedBytes / 1024).toFixed(1)} KB`);
        fetchDiagnostics();
      } else {
        showToast(data.error || 'Vacuum failed', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setVacuuming(false);
    }
  };

  const pm2Processes = diagData?.pm2 || [];
  const host = diagData?.host || {};
  const sqlite = diagData?.sqlite || {};

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg ${
          toast.type === 'error'
            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
        }`}>
          {toast.type === 'error' ? <ShieldAlert className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-900/80 border border-purple-500/20 rounded-2xl backdrop-blur-md">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              System Diagnostics &amp; PM2 Process Manager
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Live Host Telemetry
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Live PM2 daemon metrics, individual microservice restarts, SQLite WAL integrity checks, and host load monitors
            </p>
          </div>
        </div>

        <button
          onClick={fetchDiagnostics}
          className="p-2 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/40 transition"
          title="Refresh Diagnostics"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Host Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-purple-500/20">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
            Host Platform &amp; Arch
          </span>
          <span className="text-sm font-bold text-white font-mono block truncate">
            {host.platform || 'Linux'} ({host.arch || 'x64'})
          </span>
          <span className="text-[10px] text-purple-300 font-mono">
            {host.cpus || 8} Logical Cores
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-purple-500/20">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
            Load Average (1m, 5m, 15m)
          </span>
          <span className="text-sm font-bold text-amber-300 font-mono">
            {host.loadAvg ? host.loadAvg.map(n => n.toFixed(2)).join(', ') : '—'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-purple-500/20">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
            Host Memory (RAM)
          </span>
          <span className="text-sm font-bold text-emerald-400 font-mono">
            {host.freeMem && host.totalMem 
              ? `${(host.freeMem / 1024 / 1024 / 1024).toFixed(1)} GB / ${(host.totalMem / 1024 / 1024 / 1024).toFixed(1)} GB Free` 
              : '—'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-purple-500/20">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
            Root Partition (/dev/nvme)
          </span>
          <span className="text-sm font-bold text-cyan-300 font-mono">
            {host.diskUsage?.usePercent || '—'} Used ({host.diskUsage?.free || '—'} Free)
          </span>
        </div>
      </div>

      {/* PM2 Processes Table */}
      <div className="bg-slate-900/80 border border-purple-500/20 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950/60 border-b border-purple-500/20 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-purple-400" />
            PM2 Process Supercluster
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">
            Managed via local PM2 API
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/40 border-b border-purple-500/10 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                <th className="p-3.5">Service Name</th>
                <th className="p-3.5">PID</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">CPU Load</th>
                <th className="p-3.5">Memory (RSS)</th>
                <th className="p-3.5">Uptime</th>
                <th className="p-3.5">Restarts</th>
                <th className="p-3.5 text-right rtl:text-left">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-500/10 font-mono">
              {pm2Processes.map(proc => {
                const isRestarting = restartingProcess[proc.name];

                return (
                  <tr key={proc.name} className="hover:bg-purple-950/20 transition">
                    <td className="p-3.5 font-bold text-white flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-purple-400" />
                      <span>{proc.name}</span>
                    </td>
                    <td className="p-3.5 text-slate-300">
                      {proc.pid || '—'}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        proc.status === 'online'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {proc.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-amber-300 font-bold">
                      {proc.cpu !== undefined ? `${proc.cpu}%` : '—'}
                    </td>
                    <td className="p-3.5 text-purple-300 font-bold">
                      {proc.memory ? `${(proc.memory / 1024 / 1024).toFixed(1)} MB` : '—'}
                    </td>
                    <td className="p-3.5 text-slate-400">
                      {proc.uptimeSecs ? `${Math.floor(proc.uptimeSecs / 60)}m` : '—'}
                    </td>
                    <td className="p-3.5 text-slate-400">
                      {proc.restarts ?? 0}
                    </td>
                    <td className="p-3.5 text-right rtl:text-left">
                      <button
                        onClick={() => handleRestartProcess(proc.name)}
                        disabled={isRestarting}
                        className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white font-bold text-[10px] transition inline-flex items-center gap-1"
                        title={`Restart ${proc.name}`}
                      >
                        <RotateCcw className={`w-3 h-3 ${isRestarting ? 'animate-spin' : ''}`} />
                        <span>{isRestarting ? 'Restarting...' : 'Restart'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SQLite Database Telemetry Card */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-purple-500/20 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-purple-500/20">
          <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">SQLite NVMe WAL Database Engine</h3>
              <span className="text-[10px] text-slate-400 font-mono">server/data/subtie.sqlite</span>
            </div>
          </div>

          <button
            onClick={handleVacuumSqlite}
            disabled={vacuuming}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-amber-600/30"
          >
            <Database className={`w-3.5 h-3.5 ${vacuuming ? 'animate-spin' : ''}`} />
            <span>{vacuuming ? 'Vacuuming...' : 'Vacuum & Optimize DB'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase block">Database Size</span>
            <span className="text-white font-bold text-sm">{sqlite.sizeMb ? `${sqlite.sizeMb} MB` : '—'}</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase block">PRAGMA Integrity</span>
            <span className={`font-bold text-sm ${sqlite.integrity === 'ok' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {sqlite.integrity || 'ok'}
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase block">Indexed Projects</span>
            <span className="text-purple-300 font-bold text-sm">{sqlite.projectsCount ?? '—'}</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase block">Indexed Users</span>
            <span className="text-pink-300 font-bold text-sm">{sqlite.usersCount ?? '—'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
