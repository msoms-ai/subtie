import React, { useState, useEffect } from 'react';
import { 
  Settings, Save, RefreshCw, CheckCircle2, AlertTriangle, 
  ShieldAlert, Cpu, HardDrive, Zap, Cloud, Sparkles 
} from 'lucide-react';

export default function GlobalSettingsModule({ user, lang = 'en' }) {
  const [settings, setSettings] = useState({
    geminiModel: 'gemini-3.8-flash',
    fallbackModel1: 'gemini-flash-latest',
    fallbackModel2: 'gemini-pro-latest',
    visionOcrModel: 'gemini-3.8-flash',
    workerConcurrency: 2,
    maxUploadSizeMb: 4096,
    r2SyncEnabled: true,
    torrentEnabled: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', {
        headers: { 'x-user-id': user?.id || '' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(prev => ({ ...prev, ...data.settings }));
        setError(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [user?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Cluster configuration saved atomically');
        fetchSettings();
      } else {
        showToast(data.error || 'Failed to save settings', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

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
            <Settings className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              Global Cluster Tuning &amp; Platform Settings
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Atomic Config Engine
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Configure distributed AI model pipelines, worker concurrency, upload quotas, and Cloudflare R2 backup policies
            </p>
          </div>
        </div>

        <button
          onClick={fetchSettings}
          className="p-2 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/40 transition"
          title="Refresh Settings"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Gemini AI Model Orchestration */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-purple-500/20 space-y-4 shadow-xl">
          <h3 className="text-xs font-black uppercase tracking-wider text-pink-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Gemini AI Models &amp; Automatic Fallback Chain
          </h3>
          <p className="text-xs text-slate-400">
            If the primary model triggers rate limiting or is temporarily unavailable, workers automatically step down to fallback models.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">
                Primary Model (Default)
              </label>
              <select
                value={settings.geminiModel}
                onChange={(e) => setSettings({ ...settings, geminiModel: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
              >
                <option value="gemini-3.8-flash">gemini-3.8-flash (Recommended / Fastest)</option>
                <option value="gemini-flash-latest">gemini-flash-latest</option>
                <option value="gemini-pro-latest">gemini-pro-latest</option>
                <option value="gemini-3.5-flash">gemini-3.5-flash</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">
                Vision OCR Model (Signs &amp; Captions)
              </label>
              <select
                value={settings.visionOcrModel}
                onChange={(e) => setSettings({ ...settings, visionOcrModel: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
              >
                <option value="gemini-3.8-flash">gemini-3.8-flash</option>
                <option value="gemini-flash-latest">gemini-flash-latest</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">
                Tier 1 Fallback Model
              </label>
              <input
                type="text"
                value={settings.fallbackModel1 || 'gemini-flash-latest'}
                onChange={(e) => setSettings({ ...settings, fallbackModel1: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">
                Tier 2 Fallback Model
              </label>
              <input
                type="text"
                value={settings.fallbackModel2 || 'gemini-pro-latest'}
                onChange={(e) => setSettings({ ...settings, fallbackModel2: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Worker Concurrency & Storage */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-purple-500/20 space-y-4 shadow-xl">
          <h3 className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            Worker Concurrency &amp; Storage Limits
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">
                Worker Concurrency (Parallel Video Jobs)
              </label>
              <input
                type="number"
                min="1"
                max="8"
                value={settings.workerConcurrency}
                onChange={(e) => setSettings({ ...settings, workerConcurrency: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Number of simultaneous video pipelines processed across all users.
              </span>
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">
                Max Upload File Size (MB)
              </label>
              <input
                type="number"
                min="100"
                max="10240"
                value={settings.maxUploadSizeMb}
                onChange={(e) => setSettings({ ...settings, maxUploadSizeMb: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-wrap gap-6">
            <label className="flex items-center space-x-2.5 rtl:space-x-reverse cursor-pointer">
              <input
                type="checkbox"
                checked={settings.r2SyncEnabled}
                onChange={(e) => setSettings({ ...settings, r2SyncEnabled: e.target.checked })}
                className="w-4 h-4 rounded text-purple-600 focus:ring-0"
              />
              <span className="text-xs font-bold text-white">Enable Cloudflare R2 Cloud Backup Sync</span>
            </label>

            <label className="flex items-center space-x-2.5 rtl:space-x-reverse cursor-pointer">
              <input
                type="checkbox"
                checked={settings.torrentEnabled}
                onChange={(e) => setSettings({ ...settings, torrentEnabled: e.target.checked })}
                className="w-4 h-4 rounded text-purple-600 focus:ring-0"
              />
              <span className="text-xs font-bold text-white">Enable WebTorrent P2P Downloader</span>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white font-black text-xs transition flex items-center gap-2 shadow-lg shadow-purple-600/30"
          >
            <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? 'Writing Config...' : 'Save Global Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
