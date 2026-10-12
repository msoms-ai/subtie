import React, { useState, useEffect } from 'react';
import { Activity, Server, Cpu, Key, Plus, Trash2, RefreshCw, AlertTriangle, CheckCircle, Clock, Cloud, ShieldAlert } from 'lucide-react';

export default function ClusterDashboard({ lang }) {
  const isAr = lang === 'ar';
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [addingKey, setAddingKey] = useState(false);
  const [rescanning, setRescanning] = useState(false);
  const [error, setError] = useState(null);

  const fetchMetrics = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch(`/api/admin/cluster-metrics?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load cluster metrics');
      const data = await res.json();
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      if (isManual) {
        setTimeout(() => setRefreshing(false), 600);
      }
    }
  };

  const handleRescanKeys = async () => {
    setRescanning(true);
    try {
      const res = await fetch('/api/admin/gemini-keys/rescan', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to rescan keys');
      await fetchMetrics(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setRescanning(false);
    }
  };

  useEffect(() => {
    fetchMetrics(false);
    const interval = setInterval(() => fetchMetrics(false), 3000);
    return () => clearInterval(interval);
  }, []);

  const handleAddKey = async (e) => {
    e.preventDefault();
    if (!newKey.trim()) return;
    setAddingKey(true);
    try {
      const res = await fetch('/api/admin/gemini-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: newKey.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add key');
      }
      setNewKey('');
      fetchMetrics(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setAddingKey(false);
    }
  };

  const handleRemoveKey = async (id) => {
    if (!window.confirm(isAr ? 'هل أنت متأكد من حذف هذا المفتاح؟' : 'Remove this API key from the pool?')) return;
    try {
      await fetch(`/api/admin/gemini-keys/${id}`, { method: 'DELETE' });
      fetchMetrics(true);
    } catch (err) {
      alert(err.message);
    }
  };

  const poolKeys = Array.isArray(metrics?.apiPool) ? metrics.apiPool : (metrics?.apiPool?.keys || []);
  const detectedEnvNames = metrics?.apiPool?.detectedEnvNames || [];
  const storageStatus = metrics?.storage || {};

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in-up" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-purple-500/20 pb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 flex items-center gap-3">
            <Activity className="w-8 h-8 text-pink-400" />
            <span>{isAr ? 'لوحة مراقبة السيرفر والتوزيع السحابي (V2 Cluster)' : 'Cluster & Worker Dashboard (V2)'}</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {isAr
              ? 'مراقبة فورية لطابور المهام (Redis BullMQ) ومجمع مفاتيح Gemini AI والتخزين السحابي Cloudflare R2.'
              : 'Real-time telemetry for Redis BullMQ queue, Gemini AI Key Pool, and Cloudflare R2 storage.'}
          </p>
        </div>

        <button
          onClick={() => fetchMetrics(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 border border-purple-500/30 rounded-xl text-xs font-bold text-purple-300 hover:text-white hover:border-pink-500 transition shadow-inner cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-pink-400' : ''}`} />
          <span>{isAr ? (refreshing ? 'جاري المزامنة...' : 'تحديث فوري') : (refreshing ? 'Syncing...' : 'Live Sync')}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-950/50 border border-red-500/50 rounded-2xl flex items-center gap-3 text-red-200 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid: Redis Queues, Cloudflare R2 & System Health */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Active Jobs */}
        <div className="bg-slate-900/80 border border-purple-500/20 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">{isAr ? 'المهام النشطة' : 'Active Jobs'}</span>
            <Cpu className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-3xl font-black text-white">
            {metrics?.queue?.active ?? 0}
          </div>
          <span className="text-[10px] text-indigo-300 mt-1 block">
            {isAr ? 'تتم معالجتها في السيرفر' : 'Processing in background'}
          </span>
        </div>

        {/* Waiting Jobs */}
        <div className="bg-slate-900/80 border border-purple-500/20 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">{isAr ? 'في الانتظار' : 'Waiting in Queue'}</span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400">
            {metrics?.queue?.waiting ?? 0}
          </div>
          <span className="text-[10px] text-amber-300/80 mt-1 block">
            {isAr ? 'طابور انتظار Redis' : 'Queued in Redis'}
          </span>
        </div>

        {/* Completed Jobs */}
        <div className="bg-slate-900/80 border border-purple-500/20 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">{isAr ? 'المهام المكتملة' : 'Completed Jobs'}</span>
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400">
            {metrics?.queue?.completed ?? 0}
          </div>
          <span className="text-[10px] text-emerald-300/80 mt-1 block">
            {isAr ? 'تمت بنجاح' : 'Finished & ready'}
          </span>
        </div>

        {/* Cloudflare R2 Storage Status */}
        <div className={`border rounded-2xl p-5 shadow-lg relative overflow-hidden ${
          storageStatus.configured
            ? 'bg-slate-900/80 border-emerald-500/40'
            : 'bg-amber-950/20 border-amber-500/40'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">{isAr ? 'تخزين الفيديوهات' : 'Storage Engine'}</span>
            <Cloud className={`w-5 h-5 ${storageStatus.configured ? 'text-emerald-400' : 'text-amber-400'}`} />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2.5 h-2.5 rounded-full ${storageStatus.configured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-sm font-black text-white">
              {storageStatus.configured ? 'Cloudflare R2' : 'Local Fallback'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block truncate">
            {storageStatus.configured
              ? (storageStatus.bucketName || 'subtie-vault')
              : (storageStatus.missingKeys?.length > 0 ? `Missing: ${storageStatus.missingKeys.join(', ')}` : 'Local Disk')}
          </span>
        </div>

        {/* Redis Status */}
        <div className="bg-slate-900/80 border border-purple-500/20 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">{isAr ? 'حالة Redis Broker' : 'Redis Queue'}</span>
            <Server className="w-5 h-5 text-pink-400" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2.5 h-2.5 rounded-full ${metrics?.queue?.status === 'online' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="text-sm font-black text-white">
              {metrics?.queue?.status === 'online' ? 'Connected' : 'Standalone'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {metrics?.queue?.host || 'Port 6380'}
          </span>
        </div>
      </div>

      {/* Gemini API Key Pool Section */}
      <div className="bg-slate-900/90 border border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-500/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center">
              <Key className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">
                  {isAr ? 'مجمع مفاتيح Gemini AI (Key Pool)' : 'Gemini AI API Key Pool'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-[11px] font-black text-purple-300 font-mono">
                  {poolKeys.length} {isAr ? 'مفاتيح' : 'Keys'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr
                  ? 'توزيع الحمل التلقائي وتدوير المفاتيح في حال تجاوز حدود الاستخدام (429).'
                  : 'Automatic load-balancing, rotation, and cooldown management.'}
              </p>
              {detectedEnvNames.length > 0 && (
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-500 font-bold">{isAr ? 'المتغيرات المكتشفة:' : 'Detected Env:'}</span>
                  {detectedEnvNames.map(name => (
                    <span key={name} className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-indigo-300 font-mono">
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRescanKeys}
              disabled={rescanning}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-purple-500/30 text-purple-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title={isAr ? 'إعادة فحص متغيرات البيئة' : 'Rescan Environment Variables'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${rescanning ? 'animate-spin text-pink-400' : ''}`} />
              <span>{isAr ? 'إعادة فحص' : 'Rescan'}</span>
            </button>

            {/* Add Key Form */}
            <form onSubmit={handleAddKey} className="flex items-center gap-2">
              <input
                type="password"
                placeholder={isAr ? 'أدخل مفتاح API جديد...' : 'Paste new Gemini API key...'}
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="bg-slate-950 border border-purple-500/40 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
              />
              <button
                type="submit"
                disabled={addingKey}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-black rounded-xl hover:scale-105 transition shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAr ? 'إضافة مفتاح' : 'Add Key'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Table of Keys */}
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right text-xs">
            <thead>
              <tr className="border-b border-purple-500/20 text-slate-400">
                <th className="pb-3 font-extrabold">{isAr ? 'المفتاح' : 'Key ID'}</th>
                <th className="pb-3 font-extrabold">{isAr ? 'الحالة' : 'Status'}</th>
                <th className="pb-3 font-extrabold">{isAr ? 'الطلبات النشطة' : 'Active Reqs'}</th>
                <th className="pb-3 font-extrabold">{isAr ? 'إجمالي الطلبات' : 'Total Reqs'}</th>
                <th className="pb-3 font-extrabold">{isAr ? 'فترة التهدئة' : 'Cooldown'}</th>
                <th className="pb-3 font-extrabold text-center">{isAr ? 'إجراء' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-500/10">
              {poolKeys.map((key) => (
                <tr key={key.id} className="hover:bg-purple-950/20 transition">
                  <td className="py-3 font-mono font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    <span>{key.maskedKey}</span>
                  </td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        key.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : key.status === 'rate_limited'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {key.status}
                    </span>
                  </td>
                  <td className="py-3 font-bold text-slate-300">{key.activeRequests}</td>
                  <td className="py-3 font-bold text-slate-300">{key.totalRequests}</td>
                  <td className="py-3 text-slate-400 font-mono">
                    {key.cooldownSecondsRemaining > 0 ? (
                      <span className="text-amber-400 font-bold">{key.cooldownSecondsRemaining}s</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3 text-center">
                    <button
                      onClick={() => handleRemoveKey(key.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition"
                      title={isAr ? 'حذف المفتاح' : 'Delete key'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {poolKeys.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400 space-y-2">
                    <p className="font-bold text-sm text-slate-300">
                      {isAr ? 'لم يتم العثور على مفاتيح في مجمع Gemini AI حالياً.' : 'No API keys currently in pool.'}
                    </p>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      {isAr
                        ? 'يمكنك إضافة المفاتيح مباشرة عبر حقل "إضافة مفتاح" أعلاه، أو إضافتها في متغيرات بيئة Plesk بأسماء (GEMINI_KEY_1..10) ثم الضغط على "إعادة فحص".'
                        : 'You can paste keys directly above, or add them as environment variables (GEMINI_KEY_1..10) and click "Rescan".'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
