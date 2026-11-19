import React, { useState, useEffect } from 'react';
import { 
  Activity, Key, RefreshCw, Plus, Trash2, CheckCircle2, 
  XCircle, Clock, Zap, ShieldAlert, Cpu, Check, AlertTriangle, Play 
} from 'lucide-react';

export default function GeminiPoolModule({ user, lang = 'en' }) {
  const [keysData, setKeysData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [testingKey, setTestingKey] = useState({});
  const [testingAll, setTestingAll] = useState(false);
  const [newKeyInput, setNewKeyInput] = useState('');
  const [addingKey, setAddingKey] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/admin/gemini/keys', {
        headers: { 'x-user-id': user?.id || '' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      if (data.success) {
        setKeysData(data.keys || []);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch Gemini keys');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, [user?.id]);

  const handleTestKey = async (keyId) => {
    setTestingKey(prev => ({ ...prev, [keyId]: true }));
    try {
      const res = await fetch(`/api/admin/gemini/keys/${keyId}/test`, {
        method: 'POST',
        headers: { 'x-user-id': user?.id || '' }
      });
      const data = await res.json();
      setTestResults(prev => ({ ...prev, [keyId]: data }));
      if (data.success) {
        showToast(`Key ${keyId} response: ${data.reply} (${data.latencyMs}ms)`);
      } else {
        showToast(`Key ${keyId} test failed: ${data.error}`, 'error');
      }
    } catch (err) {
      setTestResults(prev => ({ ...prev, [keyId]: { success: false, error: err.message } }));
      showToast(err.message, 'error');
    } finally {
      setTestingKey(prev => ({ ...prev, [keyId]: false }));
    }
  };

  const handleTestAllKeys = async () => {
    setTestingAll(true);
    for (const k of keysData) {
      await handleTestKey(k.id);
    }
    setTestingAll(false);
  };

  const handleAddKey = async (e) => {
    e.preventDefault();
    if (!newKeyInput.trim()) return;
    setAddingKey(true);
    try {
      const res = await fetch('/api/admin/gemini/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify({ key: newKeyInput.trim() })
      });
      const data = await res.json();
      if (data.success) {
        showToast('New Gemini API key added to cluster');
        setNewKeyInput('');
        fetchKeys();
      } else {
        showToast(data.error || 'Failed to add key', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setAddingKey(false);
    }
  };

  const handleDeleteKey = async (keyId) => {
    if (!window.confirm(`Are you sure you want to remove ${keyId}?`)) return;
    try {
      const res = await fetch(`/api/admin/gemini/keys/${keyId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user?.id || '' }
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Key ${keyId} removed from cluster`);
        fetchKeys();
      } else {
        showToast(data.error || 'Failed to delete key', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const activeKeysCount = keysData.filter(k => k.status === 'active').length;
  const cooldownKeysCount = keysData.filter(k => k.status === 'cooldown').length;

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
          <div className="w-10 h-10 rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400">
            <Key className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              Gemini AI Key Pool & Model Cluster
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                {keysData.length} Keys Configured
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Round-robin rate-limit distribution (~165 RPM total pool) with automatic 429 backoff isolation
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
          <button
            onClick={handleTestAllKeys}
            disabled={testingAll || keysData.length === 0}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white transition shadow-lg shadow-purple-600/30"
          >
            <Zap className={`w-4 h-4 ${testingAll ? 'animate-spin' : ''}`} />
            <span>{testingAll ? 'Testing Pool...' : 'Test All Keys (Parallel Ping)'}</span>
          </button>

          <button
            onClick={fetchKeys}
            className="p-2 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/40 transition"
            title="Refresh Key Status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Architectural Context Explainer */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 border border-purple-500/20">
        <h3 className="text-xs font-black uppercase tracking-wider text-purple-300 mb-2 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-pink-400" />
          Why 11 Keys? Distribution vs Google Quotas
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Google AI Studio enforces a strict <strong>15 RPM (Requests Per Minute)</strong> limit per API key. When transcribing a 24-minute anime episode, Subtie splits the audio into 10–12 chunks. If processed using a single key, concurrent requests trigger <code className="bg-slate-800 px-1 py-0.5 rounded text-rose-300">HTTP 429: Resource Exhausted</code>, stalling the pipeline.
          With <strong>11 Keys</strong>, Subtie achieves an aggregate throughput of <strong>~165 RPM</strong>. Each chunk is dispatched to the least-burdened key in the pool, and if any key hits quota, it is isolated in cooldown for 60s while the remaining 10 keys continue processing without interruption.
        </p>
      </div>

      {/* Pool Health Gauges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-purple-500/20">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
            Total Cluster Keys
          </span>
          <span className="text-2xl font-black text-white">{keysData.length}</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-purple-500/20">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
            Active / Ready Keys
          </span>
          <span className="text-2xl font-black text-emerald-400">{activeKeysCount}</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-purple-500/20">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
            In Cooldown / Quota Wait
          </span>
          <span className={`text-2xl font-black ${cooldownKeysCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
            {cooldownKeysCount}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-purple-500/20">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
            Aggregate RPM Capacity
          </span>
          <span className="text-2xl font-black text-pink-400">~{keysData.length * 15} RPM</span>
        </div>
      </div>

      {/* Add New Key Bar */}
      <form onSubmit={handleAddKey} className="p-4 bg-slate-900/70 border border-purple-500/20 rounded-2xl flex flex-wrap gap-3 items-center">
        <div className="relative flex-grow">
          <Key className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={newKeyInput}
            onChange={(e) => setNewKeyInput(e.target.value)}
            placeholder="Add new Gemini API Key (AIzaSy...)"
            className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
          />
        </div>
        <button
          type="submit"
          disabled={addingKey || !newKeyInput.trim()}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-purple-600/30"
        >
          <Plus className="w-4 h-4" />
          <span>{addingKey ? 'Adding Key...' : 'Add Key to Cluster'}</span>
        </button>
      </form>

      {/* Keys Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {keysData.map((k, index) => {
          const testRes = testResults[k.id];
          const isTesting = testingKey[k.id];
          const isCooldown = k.status === 'cooldown';

          return (
            <div
              key={k.id}
              className={`p-4 rounded-2xl bg-slate-900/80 border backdrop-blur-md transition-all shadow-lg ${
                isCooldown
                  ? 'border-amber-500/40 bg-amber-950/10'
                  : 'border-purple-500/20 hover:border-purple-500/40'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <div className="w-7 h-7 rounded-lg bg-fuchsia-500/20 text-fuchsia-300 flex items-center justify-center font-bold text-xs">
                    #{index + 1}
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-white block">
                      {k.id}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {k.maskedKey}
                    </span>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  isCooldown
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {k.status}
                </span>
              </div>

              {/* Metrics */}
              <div className="bg-slate-950/60 rounded-xl p-2.5 space-y-1.5 text-[11px] font-mono mb-3">
                <div className="flex justify-between text-slate-400">
                  <span>Active Requests:</span>
                  <span className="font-bold text-white">{k.activeRequests || 0}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Total Dispatched:</span>
                  <span className="font-bold text-purple-300">{k.totalRequests || 0}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Errors / Rate-Limits:</span>
                  <span className={`font-bold ${k.errorsCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {k.errorsCount || 0}
                  </span>
                </div>
                {k.cooldownSecondsRemaining > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Cooldown Remaining:</span>
                    <span className="font-bold">{k.cooldownSecondsRemaining}s</span>
                  </div>
                )}
              </div>

              {/* Live Test Result Badge */}
              {testRes && (
                <div className={`p-2 rounded-xl text-[10px] font-mono mb-3 ${
                  testRes.success
                    ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
                }`}>
                  {testRes.success ? (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 font-bold">
                        <Check className="w-3 h-3 text-emerald-400" />
                        Reply: {testRes.reply}
                      </span>
                      <span className="font-bold">{testRes.latencyMs}ms</span>
                    </div>
                  ) : (
                    <span className="truncate block" title={testRes.error}>
                      Error: {testRes.error}
                    </span>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 rtl:space-x-reverse pt-1">
                <button
                  onClick={() => handleTestKey(k.id)}
                  disabled={isTesting}
                  className="flex-grow py-1.5 px-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <Activity className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Pinging...' : 'Live Ping Test'}</span>
                </button>

                <button
                  onClick={() => handleDeleteKey(k.id)}
                  className="p-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white transition"
                  title="Remove Key"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
