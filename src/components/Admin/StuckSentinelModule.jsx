import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertTriangle, RefreshCw, RotateCcw, CheckCircle2, 
  XCircle, Clock, Play, Trash2, Zap, ArrowRight, Activity 
} from 'lucide-react';

export default function StuckSentinelModule({ user, lang = 'en' }) {
  const [sentinelData, setSentinelData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [healing, setHealing] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchSentinel = async () => {
    try {
      const res = await fetch('/api/admin/sentinel/stuck-tasks', {
        headers: { 'x-user-id': user?.id || '' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      if (data.success) {
        setSentinelData(data);
        setError(null);
      } else {
        setError(data.error || 'Failed to query Sentinel');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSentinel();
    const interval = setInterval(fetchSentinel, 5000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleAutoHealAll = async () => {
    setHealing(true);
    try {
      const res = await fetch('/api/admin/sentinel/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify({ action: 'auto_heal_all' })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Auto-healed ${data.healedCount || 0} stuck tasks!`);
        fetchSentinel();
      } else {
        showToast(data.error || 'Auto-heal failed', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setHealing(false);
    }
  };

  const handleTaskAction = async (targetId, action) => {
    setActionLoading(prev => ({ ...prev, [targetId]: true }));
    try {
      const res = await fetch('/api/admin/sentinel/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify({ action, targetId })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Task ${targetId} updated: ${action}`);
        fetchSentinel();
      } else {
        showToast(data.error || 'Action failed', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [targetId]: false }));
    }
  };

  const totalStuck = sentinelData?.totalStuck || 0;
  const stuckProjects = sentinelData?.stuckProjects || [];
  const stuckTorrents = sentinelData?.stuckTorrents || [];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg ${
          toast.type === 'error'
            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
        }`}>
          {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-900/80 border border-purple-500/20 rounded-2xl backdrop-blur-md">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <ShieldCheck className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              Activities & Stuck Tasks Sentinel
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                totalStuck > 0 
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse' 
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {totalStuck > 0 ? `${totalStuck} Stalled` : 'Radar Clean'}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Autonomous watchdog monitoring stalled video processing pipelines (&gt;15m) and zero-peer torrent downloads
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
          {totalStuck > 0 && (
            <button
              onClick={handleAutoHealAll}
              disabled={healing}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-rose-600 hover:opacity-90 text-white transition shadow-lg shadow-rose-600/30"
            >
              <Zap className={`w-4 h-4 ${healing ? 'animate-spin' : ''}`} />
              <span>{healing ? 'Healing Tasks...' : 'Auto-Heal All Tasks'}</span>
            </button>
          )}

          <button
            onClick={fetchSentinel}
            className="p-2 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/40 transition"
            title="Scan Sentinel Radar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sentinel Status Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-purple-500/20">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
            Total Stuck / Orphan Tasks
          </span>
          <span className={`text-2xl font-black ${totalStuck > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {totalStuck}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-purple-500/20">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
            Stuck Video Pipelines
          </span>
          <span className="text-2xl font-black text-amber-400">
            {stuckProjects.length}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-purple-500/20">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
            Stalled Torrents (0 Peers)
          </span>
          <span className="text-2xl font-black text-blue-400">
            {stuckTorrents.length}
          </span>
        </div>
      </div>

      {/* Stuck Projects Table */}
      <div className="bg-slate-900/80 border border-purple-500/20 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950/60 border-b border-purple-500/20 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" />
            Detected Stalled Tasks
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">
            Auto-Scan Threshold: 15 Minutes Inactivity
          </span>
        </div>

        {loading && !sentinelData ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-purple-400" />
            <p className="text-xs">Scanning background processes...</p>
          </div>
        ) : totalStuck === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/60" />
            <p className="text-xs font-bold text-slate-300">Sentinel Radar: 100% Nominal</p>
            <p className="text-[11px] text-slate-500">
              No stuck video jobs, locked BullMQ claims, or dead torrents detected.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/40 border-b border-purple-500/10 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">ID / Name</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Current Stage</th>
                  <th className="p-3.5">Inactivity Time</th>
                  <th className="p-3.5 text-right rtl:text-left">Recovery Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-500/10">
                {stuckProjects.map(proj => (
                  <tr key={proj.id} className="hover:bg-purple-950/20 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-white leading-tight">
                        {proj.projectName || 'Unnamed Project'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {proj.id}
                      </div>
                    </td>
                    <td className="p-3.5 font-bold text-amber-300">
                      Video Pipeline
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {proj.status} ({proj.progress || 0}%)
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-rose-400 font-bold">
                      {proj.stuckMinutes ? `${proj.stuckMinutes} mins` : 'Stalled'}
                    </td>
                    <td className="p-3.5 text-right rtl:text-left">
                      <div className="flex items-center justify-end rtl:justify-start space-x-1.5 rtl:space-x-reverse">
                        <button
                          onClick={() => handleTaskAction(proj.id, 're_enqueue')}
                          disabled={actionLoading[proj.id]}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition flex items-center gap-1"
                          title="Re-enqueue into BullMQ"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Re-enqueue</span>
                        </button>
                        <button
                          onClick={() => handleTaskAction(proj.id, 'mark_failed')}
                          disabled={actionLoading[proj.id]}
                          className="px-2.5 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-[10px] transition"
                        >
                          Mark Failed
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {stuckTorrents.map(tor => (
                  <tr key={tor.id} className="hover:bg-purple-950/20 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-white leading-tight">
                        {tor.name || 'Torrent Download'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {tor.infoHash?.substring(0, 16)}...
                      </div>
                    </td>
                    <td className="p-3.5 font-bold text-blue-300">
                      WebTorrent
                    </td>
                    <td className="p-3.5 text-slate-400">
                      0 Peers / Stalled ({tor.progress ? (tor.progress * 100).toFixed(1) : 0}%)
                    </td>
                    <td className="p-3.5 font-mono text-rose-400 font-bold">
                      &gt; 20 mins
                    </td>
                    <td className="p-3.5 text-right rtl:text-left">
                      <button
                        onClick={() => handleTaskAction(tor.id, 'cancel_torrent')}
                        disabled={actionLoading[tor.id]}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] transition flex items-center gap-1 ml-auto"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Cancel Torrent</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
