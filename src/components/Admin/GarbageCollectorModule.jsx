import React, { useState, useEffect } from 'react';
import { 
  Trash2, RefreshCw, AlertTriangle, CheckCircle2, ShieldAlert, 
  HardDrive, Sparkles, Folder, File, Check, X, Shield 
} from 'lucide-react';

export default function GarbageCollectorModule({ user, lang = 'en' }) {
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [error, setError] = useState(null);
  const [cleanSummary, setCleanSummary] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const runScan = async () => {
    setLoading(true);
    setCleanSummary(null);
    try {
      const res = await fetch('/api/admin/garbage/scan', {
        headers: { 'x-user-id': user?.id || '' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      if (data.success) {
        setScanResult(data.scan);
        setError(null);
      } else {
        setError(data.error || 'Failed to scan orphan items');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runScan();
  }, [user?.id]);

  const handleExecuteClean = async () => {
    const totalMb = scanResult ? (scanResult.totalBytes / 1024 / 1024).toFixed(1) : '0';
    if (!window.confirm(`Reclaim ${totalMb} MB of disk space? This will safely delete ${scanResult?.totalCount} orphan audio chunks and unlinked temporary files.`)) {
      return;
    }

    setCleaning(true);
    try {
      const res = await fetch('/api/admin/garbage/clean', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify({
          cleanAudioChunks: true,
          cleanTempFiles: true,
          cleanOrphanDirs: true,
          cleanOrphanSubs: true
        })
      });
      const data = await res.json();
      if (data.success) {
        setCleanSummary(data.summary);
        showToast(`Successfully reclaimed ${(data.summary.totalBytesReclaimed / 1024 / 1024).toFixed(1)} MB!`);
        runScan();
      } else {
        showToast(data.error || 'Cleanup execution failed', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setCleaning(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const totalBytes = scanResult?.totalBytes || 0;
  const totalCount = scanResult?.totalCount || 0;
  const categories = scanResult?.categories || {};

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
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Trash2 className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              Garbage Collector &amp; NVMe Storage Reclaimer
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                totalBytes > 0 
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {totalBytes > 0 ? `${formatBytes(totalBytes)} Reclaimable` : 'Disk Clean'}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Safe garbage collection scanning unlinked directories, completed audio chunks, and atomic temp buffers
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
          {totalBytes > 0 && (
            <button
              onClick={handleExecuteClean}
              disabled={cleaning}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-rose-600 to-pink-600 hover:opacity-90 text-white transition shadow-lg shadow-rose-600/30"
            >
              <Trash2 className={`w-4 h-4 ${cleaning ? 'animate-spin' : ''}`} />
              <span>{cleaning ? 'Reclaiming...' : `Reclaim ${formatBytes(totalBytes)} Space`}</span>
            </button>
          )}

          <button
            onClick={runScan}
            className="p-2 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/40 transition"
            title="Re-scan Garbage"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Reclaimed Summary Banner (if just cleaned) */}
      {cleanSummary && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <div>
              <h3 className="text-xs font-black text-white">Reclamation Complete</h3>
              <p className="text-xs text-emerald-300">
                Successfully removed {cleanSummary.deletedCount} orphan files and freed {formatBytes(cleanSummary.totalBytesReclaimed)} on host NVMe disk!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Category Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { key: 'audioChunks', label: 'Completed Audio Chunks', icon: File, color: 'text-amber-400', border: 'border-amber-500/30' },
          { key: 'orphanDirs', label: 'Unlinked Folders', icon: Folder, color: 'text-rose-400', border: 'border-rose-500/30' },
          { key: 'orphanSubs', label: 'Orphan Subtitles', icon: File, color: 'text-purple-400', border: 'border-purple-500/30' },
          { key: 'tempFiles', label: 'Atomic Temp Buffers', icon: Trash2, color: 'text-blue-400', border: 'border-blue-500/30' }
        ].map(cat => {
          const item = categories[cat.key] || { count: 0, bytes: 0 };
          const Icon = cat.icon;

          return (
            <div key={cat.key} className={`p-4 rounded-2xl bg-slate-900/60 border ${cat.border}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  {cat.label}
                </span>
                <Icon className={`w-4 h-4 ${cat.color}`} />
              </div>
              <span className={`text-xl font-black ${cat.color} block`}>
                {formatBytes(item.bytes)}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {item.count} items detected
              </span>
            </div>
          );
        })}
      </div>

      {/* Scan Results Table */}
      <div className="bg-slate-900/80 border border-purple-500/20 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950/60 border-b border-purple-500/20 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-purple-400" />
            Detected Reclaimable Files
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">
            Scanned At: {scanResult?.scannedAt ? new Date(scanResult.scannedAt).toLocaleTimeString() : '—'}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-purple-400" />
            <p className="text-xs">Scanning NVMe storage tree...</p>
          </div>
        ) : totalCount === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/60" />
            <p className="text-xs font-bold text-slate-300">Clean Disk State: 0 Orphan Files</p>
            <p className="text-[11px] text-slate-500">
              No dead audio chunks or unlinked project files require reclamation.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[480px]">
            <table className="w-full text-left rtl:text-right border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-950 border-b border-purple-500/20 text-slate-400 font-black uppercase tracking-wider text-[10px] z-10">
                <tr>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Host Path</th>
                  <th className="p-3.5">Reclaimable Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-500/10 font-mono">
                {Object.entries(categories).flatMap(([catKey, catData]) => 
                  (catData.items || []).map((item, idx) => (
                    <tr key={`${catKey}-${idx}`} className="hover:bg-purple-950/20 transition">
                      <td className="p-3.5 text-slate-400 font-bold capitalize">
                        {item.type || catKey}
                      </td>
                      <td className="p-3.5 text-purple-200 truncate max-w-[500px]" title={item.path}>
                        {item.path}
                      </td>
                      <td className="p-3.5 font-bold text-rose-300">
                        {formatBytes(item.bytes)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
