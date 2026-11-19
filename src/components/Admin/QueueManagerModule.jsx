import React, { useState, useEffect } from 'react';
import { 
  Zap, Play, Pause, Trash2, RotateCcw, AlertCircle, CheckCircle2, 
  Clock, ArrowRight, RefreshCw, Layers, Eye, Check, X, ShieldAlert 
} from 'lucide-react';

export default function QueueManagerModule({ user, lang = 'en' }) {
  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'waiting', 'failed', 'completed'
  const [actionLoading, setActionLoading] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchQueueData = async () => {
    try {
      const res = await fetch('/api/admin/queue/jobs', {
        headers: { 'x-user-id': user?.id || '' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      if (data.success) {
        setQueueData(data);
        setError(null);
      } else {
        setError(data.error || 'Failed to load queue data');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueData();
    const interval = setInterval(fetchQueueData, 4000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleQueueToggle = async () => {
    const isPaused = queueData?.isPaused;
    const endpoint = isPaused ? '/api/admin/queue/resume' : '/api/admin/queue/pause';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'x-user-id': user?.id || '' }
      });
      const data = await res.json();
      if (data.success) {
        showToast(isPaused ? 'BullMQ Queue Resumed' : 'BullMQ Queue Paused');
        fetchQueueData();
      } else {
        showToast(data.error || 'Operation failed', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCleanQueue = async (gracePeriodMs = 0, limit = 50, status = 'completed') => {
    if (!window.confirm(`Are you sure you want to clean ${status} jobs?`)) return;
    try {
      const res = await fetch('/api/admin/queue/clean', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify({ gracePeriodMs, limit, status })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Cleaned ${data.cleanedCount || 0} ${status} jobs`);
        fetchQueueData();
      } else {
        showToast(data.error || 'Failed to clean queue', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleJobAction = async (jobId, action) => {
    setActionLoading(prev => ({ ...prev, [jobId]: true }));
    try {
      const res = await fetch(`/api/admin/queue/job/${jobId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Job ${jobId} action "${action}" executed`);
        fetchQueueData();
      } else {
        showToast(data.error || `Action "${action}" failed`, 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [jobId]: false }));
    }
  };

  const counts = queueData?.counts || {
    active: 0,
    waiting: 0,
    failed: 0,
    completed: 0,
    delayed: 0
  };

  const currentJobs = queueData?.[activeTab] || [];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between shadow-lg transition-all ${
          toast.type === 'error' 
            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Control Strip & Counters */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-900/80 border border-purple-500/20 rounded-2xl backdrop-blur-md">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
            <Zap className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              BullMQ & Redis Queue Control Center
              {queueData?.isPaused ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  PAUSED
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ACTIVE
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              Live BullMQ queue state, concurrency management, and atomic job manipulation
            </p>
          </div>
        </div>

        {/* Global Queue Action Controls */}
        <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
          <button
            onClick={handleQueueToggle}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-black transition shadow-md ${
              queueData?.isPaused
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
            }`}
          >
            {queueData?.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            <span>{queueData?.isPaused ? 'Resume All Processing' : 'Pause Queue'}</span>
          </button>

          <button
            onClick={() => handleCleanQueue(0, 50, 'completed')}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Clean Completed</span>
          </button>

          <button
            onClick={() => handleCleanQueue(0, 50, 'failed')}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-rose-950 text-rose-300 border border-rose-500/30 transition"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Clean Failed</span>
          </button>

          <button
            onClick={fetchQueueData}
            className="p-2 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/40 transition"
            title="Refresh Queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { id: 'active', label: 'Active Jobs', count: counts.active, color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-950/20' },
          { id: 'waiting', label: 'Waiting in Queue', count: counts.waiting, color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-950/20' },
          { id: 'failed', label: 'Failed Jobs', count: counts.failed, color: 'text-rose-400', border: 'border-rose-500/30', bg: 'bg-rose-950/20' },
          { id: 'completed', label: 'Completed Jobs', count: counts.completed, color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-950/20' },
          { id: 'delayed', label: 'Delayed / Scheduled', count: counts.delayed, color: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-950/20' }
        ].map(item => (
          <div
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`cursor-pointer p-4 rounded-2xl border transition-all ${item.bg} ${item.border} ${
              activeTab === item.id ? 'ring-2 ring-purple-500 scale-[1.02]' : 'hover:opacity-80'
            }`}
          >
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              {item.label}
            </span>
            <span className={`text-2xl font-black ${item.color}`}>
              {item.count}
            </span>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-purple-500/20 space-x-4 rtl:space-x-reverse">
        {['active', 'waiting', 'failed', 'completed'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-xs font-black uppercase tracking-wider transition relative ${
              activeTab === tab ? 'text-pink-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{tab} ({counts[tab] || 0})</span>
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Jobs Table / List */}
      <div className="bg-slate-900/80 border border-purple-500/20 rounded-2xl overflow-hidden shadow-xl">
        {loading && !queueData ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-purple-400" />
            <p className="text-xs">Connecting to BullMQ Queue...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-400 space-y-2">
            <ShieldAlert className="w-8 h-8 mx-auto text-rose-500" />
            <p className="text-xs font-bold">Failed to load BullMQ queue: {error}</p>
          </div>
        ) : currentJobs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs font-bold">No {activeTab} jobs in queue at this time.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/60 border-b border-purple-500/20 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">Job ID</th>
                  <th className="p-3.5">Project / Task</th>
                  <th className="p-3.5">Progress</th>
                  <th className="p-3.5">Attempts</th>
                  <th className="p-3.5">Timestamps</th>
                  <th className="p-3.5 text-right rtl:text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-500/10">
                {currentJobs.map(job => (
                  <tr key={job.id} className="hover:bg-purple-950/20 transition">
                    {/* Job ID */}
                    <td className="p-3.5 font-mono text-purple-300 font-bold">
                      {job.id}
                    </td>

                    {/* Project / Task Name */}
                    <td className="p-3.5">
                      <div className="font-bold text-white leading-tight">
                        {job.projectName || job.name || 'Unnamed Job'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Project ID: {job.projectId || '—'}
                      </div>
                    </td>

                    {/* Progress */}
                    <td className="p-3.5">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all"
                            style={{ width: `${job.progress || 0}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-slate-300 font-bold">
                          {job.progress || 0}%
                        </span>
                      </div>
                    </td>

                    {/* Attempts */}
                    <td className="p-3.5 font-mono text-slate-300">
                      {job.attemptsMade || 0} / {job.opts?.attempts || 3}
                    </td>

                    {/* Timestamps / Error */}
                    <td className="p-3.5 font-mono text-[10px] text-slate-400">
                      {job.failedReason ? (
                        <span className="text-rose-400 font-bold block truncate max-w-[200px]" title={job.failedReason}>
                          {job.failedReason}
                        </span>
                      ) : (
                        <span>
                          {job.timestamp ? new Date(job.timestamp).toLocaleTimeString() : '—'}
                        </span>
                      )}
                    </td>

                    {/* Real Actions */}
                    <td className="p-3.5 text-right rtl:text-left">
                      <div className="flex items-center justify-end rtl:justify-start space-x-1.5 rtl:space-x-reverse">
                        {activeTab === 'failed' && (
                          <button
                            onClick={() => handleJobAction(job.id, 'retry')}
                            disabled={actionLoading[job.id]}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition flex items-center gap-1"
                            title="Retry failed job"
                          >
                            <RotateCcw className={`w-3 h-3 ${actionLoading[job.id] ? 'animate-spin' : ''}`} />
                            <span>Retry</span>
                          </button>
                        )}

                        {activeTab === 'waiting' && (
                          <button
                            onClick={() => handleJobAction(job.id, 'promote')}
                            disabled={actionLoading[job.id]}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] transition flex items-center gap-1"
                            title="Promote to front of queue"
                          >
                            <ArrowRight className="w-3 h-3" />
                            <span>Promote</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleJobAction(job.id, 'remove')}
                          disabled={actionLoading[job.id]}
                          className="px-2.5 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-[10px] transition flex items-center gap-1"
                          title="Remove job from queue"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
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
