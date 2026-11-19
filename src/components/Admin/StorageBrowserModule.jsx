import React, { useState, useEffect } from 'react';
import { 
  HardDrive, Cloud, Search, RefreshCw, Trash2, Download, 
  ExternalLink, File, Folder, CheckCircle2, ShieldAlert, AlertTriangle 
} from 'lucide-react';

export default function StorageBrowserModule({ user, lang = 'en' }) {
  const [activeTab, setActiveTab] = useState('r2'); // 'r2', 'local'
  const [r2Data, setR2Data] = useState(null);
  const [localData, setLocalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchStorage = async () => {
    setLoading(true);
    try {
      if (activeTab === 'r2') {
        const res = await fetch('/api/admin/storage/r2/objects', {
          headers: { 'x-user-id': user?.id || '' }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const data = await res.json();
        if (data.success) {
          setR2Data(data);
          setError(null);
        } else {
          setError(data.error || 'Failed to load Cloudflare R2 storage');
        }
      } else {
        const res = await fetch('/api/admin/storage/browse', {
          headers: { 'x-user-id': user?.id || '' }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const data = await res.json();
        if (data.success) {
          setLocalData(data);
          setError(null);
        } else {
          setError(data.error || 'Failed to browse local storage');
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorage();
  }, [activeTab, user?.id]);

  const handleDeleteR2Object = async (key) => {
    if (!window.confirm(`Delete object "${key}" from Cloudflare R2 bucket?`)) return;
    try {
      const res = await fetch(`/api/admin/storage/r2/object?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user?.id || '' }
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Object removed from R2`);
        fetchStorage();
      } else {
        showToast(data.error || 'Failed to delete object', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const r2Objects = (r2Data?.objects || []).filter(o => 
    o.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const localEntries = (localData?.entries || []).filter(e =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <HardDrive className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              Dual Storage Explorer &amp; Cloudflare R2 Vault
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {activeTab === 'r2' ? 'Cloudflare S3 Vault' : 'Host NVMe Disk'}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Browse raw video files, audio chunks, subtitle exports, and inspect remote Cloudflare R2 bucket objects
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter file path or key..."
              className="bg-slate-950/80 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 w-56"
            />
          </div>

          <button
            onClick={fetchStorage}
            className="p-2 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/40 transition"
            title="Refresh Files"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-purple-500/20 space-x-4 rtl:space-x-reverse">
        <button
          onClick={() => setActiveTab('r2')}
          className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition relative ${
            activeTab === 'r2' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cloud className="w-4 h-4" />
          <span>Cloudflare R2 Bucket ({r2Data?.bucket || 'subtie-vault'})</span>
          {activeTab === 'r2' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('local')}
          className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition relative ${
            activeTab === 'local' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>Local NVMe File System (/server/uploads)</span>
          {activeTab === 'local' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full" />
          )}
        </button>
      </div>

      {/* Explorer Table */}
      <div className="bg-slate-900/80 border border-purple-500/20 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-cyan-400" />
            <p className="text-xs">Querying storage subsystem...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-400 space-y-2">
            <ShieldAlert className="w-8 h-8 mx-auto text-rose-500" />
            <p className="text-xs font-bold">{error}</p>
          </div>
        ) : activeTab === 'r2' ? (
          r2Objects.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <p className="text-xs font-bold">No objects found in Cloudflare R2 bucket.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-purple-500/20 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                    <th className="p-3.5">Cloudflare Object Key</th>
                    <th className="p-3.5">File Size</th>
                    <th className="p-3.5">Last Modified</th>
                    <th className="p-3.5 text-right rtl:text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-500/10">
                  {r2Objects.map(obj => (
                    <tr key={obj.key} className="hover:bg-cyan-950/20 transition">
                      <td className="p-3.5 font-mono text-cyan-200">
                        <div className="flex items-center gap-2">
                          <File className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span className="truncate max-w-[450px]" title={obj.key}>
                            {obj.key}
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-300 font-bold">
                        {formatBytes(obj.size)}
                      </td>
                      <td className="p-3.5 font-mono text-[10px] text-slate-400">
                        {obj.lastModified ? new Date(obj.lastModified).toLocaleString() : '—'}
                      </td>
                      <td className="p-3.5 text-right rtl:text-left">
                        <div className="flex items-center justify-end rtl:justify-start space-x-1.5 rtl:space-x-reverse">
                          {obj.publicUrl && (
                            <a
                              href={obj.publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white transition"
                              title="Open Public CDN URL"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => handleDeleteR2Object(obj.key)}
                            className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white transition"
                            title="Delete R2 Object"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          localEntries.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <p className="text-xs font-bold">No entries found in local uploads.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-purple-500/20 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                    <th className="p-3.5">Name</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Size</th>
                    <th className="p-3.5">Modified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-500/10">
                  {localEntries.map((e, idx) => (
                    <tr key={idx} className="hover:bg-purple-950/20 transition">
                      <td className="p-3.5 font-mono text-white flex items-center gap-2">
                        {e.isDirectory ? <Folder className="w-4 h-4 text-amber-400" /> : <File className="w-4 h-4 text-purple-400" />}
                        <span>{e.name}</span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-400">
                        {e.isDirectory ? 'Directory' : 'File'}
                      </td>
                      <td className="p-3.5 font-mono text-slate-300">
                        {e.isDirectory ? '—' : formatBytes(e.size)}
                      </td>
                      <td className="p-3.5 font-mono text-[10px] text-slate-400">
                        {e.mtime ? new Date(e.mtime).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
