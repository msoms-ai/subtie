import React, { useState, useEffect } from 'react';
import { 
  Film, Search, RefreshCw, Trash2, RotateCcw, Cloud, HardDrive, 
  Download, Eye, CheckCircle2, AlertTriangle, ShieldAlert, Sparkles, 
  Clock, Play, FileText, Check 
} from 'lucide-react';

export default function ProjectsCrudModule({ user, lang = 'en' }) {
  const [projectsList, setProjectsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/admin/projects', {
        headers: { 'x-user-id': user?.id || '' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      if (data.success) {
        setProjectsList(data.projects || []);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch projects');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user?.id]);

  const handleProjectAction = async (projectId, action) => {
    if (action === 'purge_local_raw' && !window.confirm('Purge local raw video file? Subtitles and R2 cloud copy will be preserved.')) return;
    if (action === 'rerun_pipeline' && !window.confirm('Re-run AI transcription & translation pipeline for this video?')) return;

    setActionLoading(prev => ({ ...prev, [projectId]: action }));
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Action "${action}" completed successfully`);
        fetchProjects();
      } else {
        showToast(data.error || `Action failed`, 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [projectId]: null }));
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm(`Permanently delete project ${projectId} and all associated files?`)) return;
    try {
      const res = await fetch(`/api/admin/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user?.id || '' }
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Project ${projectId} deleted`);
        fetchProjects();
      } else {
        showToast(data.error || 'Failed to delete project', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const filteredProjects = projectsList.filter(p => {
    const term = searchTerm.toLowerCase();
    const title = (p.projectName || '').toLowerCase();
    const media = (p.mediaTitle || '').toLowerCase();
    const cat = (p.category || '').toLowerCase();
    const matchesSearch = title.includes(term) || media.includes(term) || cat.includes(term) || p.id.toLowerCase().includes(term);
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
          <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
            <Film className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              Video Projects &amp; Subtitle Asset Catalog
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-pink-500/20 text-pink-300 border border-pink-500/30">
                {projectsList.length} Total Projects
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Browse video assets, trigger Cloudflare R2 synchronizations, re-run pipelines, and purge multi-GB raw videos to free NVMe disk
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
          >
            <option value="all">All Statuses</option>
            <option value="ready">Ready (Complete)</option>
            <option value="processing">Processing</option>
            <option value="downloading">Downloading</option>
            <option value="failed">Failed</option>
          </select>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by series, episode, ID..."
              className="bg-slate-950/80 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-purple-500 w-56"
            />
          </div>

          <button
            onClick={fetchProjects}
            className="p-2 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/40 transition"
            title="Refresh Projects"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-slate-900/80 border border-purple-500/20 rounded-2xl overflow-hidden shadow-xl">
        {loading && projectsList.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-purple-400" />
            <p className="text-xs">Loading video catalog...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-xs font-bold">No projects matched your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/60 border-b border-purple-500/20 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">Series / Title</th>
                  <th className="p-3.5">Status &amp; Progress</th>
                  <th className="p-3.5">Storage &amp; Cloud</th>
                  <th className="p-3.5">Subtitles</th>
                  <th className="p-3.5">Created</th>
                  <th className="p-3.5 text-right rtl:text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-500/10">
                {filteredProjects.map(p => {
                  const isPurging = actionLoading[p.id] === 'purge_local_raw';
                  const isSyncing = actionLoading[p.id] === 'sync_r2';
                  const isRerunning = actionLoading[p.id] === 'rerun_pipeline';

                  return (
                    <tr key={p.id} className="hover:bg-purple-950/20 transition">
                      {/* Title & Info */}
                      <td className="p-3.5">
                        <div className="font-bold text-white leading-tight">
                          {p.projectName || 'Untitled Series'}
                        </div>
                        <div className="text-[11px] text-purple-300 font-medium">
                          {p.mediaTitle || 'Episode'} ({p.projectType || 'Video'})
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          ID: {p.id} | User: {p.userId || '—'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-block mb-1 ${
                          p.status === 'ready'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : p.status === 'failed'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                        }`}>
                          {p.status} ({p.processingProgress || 0}%)
                        </span>
                        <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                          {p.processingStatus || '—'}
                        </div>
                      </td>

                      {/* Storage Badges */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono ${
                            p.r2Synced 
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            <Cloud className="w-3 h-3" />
                            {p.r2Synced ? 'R2 Vault Synced' : 'Local NVMe Only'}
                          </span>
                          {p.localRawPurged && (
                            <span className="block text-[10px] font-mono text-emerald-400">
                              ✓ Raw Video Purged (Reclaimed)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Subtitles Count */}
                      <td className="p-3.5 font-mono text-slate-300">
                        {p.subtitles?.length ? (
                          <span className="font-bold text-pink-300 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {p.subtitles.length} lines
                          </span>
                        ) : (
                          <span className="text-slate-500">None</span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="p-3.5 font-mono text-[10px] text-slate-400">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}
                      </td>

                      {/* Real Action Buttons */}
                      <td className="p-3.5 text-right rtl:text-left">
                        <div className="flex items-center justify-end rtl:justify-start space-x-1.5 rtl:space-x-reverse">
                          {/* Purge Local Raw Video Button (to reclaim disk) */}
                          {!p.localRawPurged && p.status === 'ready' && (
                            <button
                              onClick={() => handleProjectAction(p.id, 'purge_local_raw')}
                              disabled={isPurging}
                              className="px-2 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white font-bold text-[10px] transition flex items-center gap-1 border border-cyan-500/30"
                              title="Delete local raw MP4 file to reclaim NVMe storage (subtitles and R2 cloud copy stay intact)"
                            >
                              <HardDrive className={`w-3 h-3 ${isPurging ? 'animate-spin' : ''}`} />
                              <span>Purge Raw</span>
                            </button>
                          )}

                          {/* Re-run Pipeline */}
                          <button
                            onClick={() => handleProjectAction(p.id, 'rerun_pipeline')}
                            disabled={isRerunning}
                            className="p-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white transition"
                            title="Re-run AI Video Pipeline"
                          >
                            <RotateCcw className={`w-3.5 h-3.5 ${isRerunning ? 'animate-spin' : ''}`} />
                          </button>

                          {/* Delete Project */}
                          <button
                            onClick={() => handleDeleteProject(p.id)}
                            className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white transition"
                            title="Delete Project Completely"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
