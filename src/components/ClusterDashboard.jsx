import React, { useState, useEffect } from 'react';
import { Activity, Server, Cpu, Key, Plus, Trash2, RefreshCw, AlertTriangle, CheckCircle, Clock, Cloud } from 'lucide-react';

export default function ClusterDashboard({ lang }) {
  const isAr = lang === 'ar';
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [addingKey, setAddingKey] = useState(false);
  const [rescanning, setRescanning] = useState(false);
  const [error, setError] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const formatLastUsed = (ts) => {
    if (!ts) return '—';
    const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (diffSec < 5) return isAr ? 'الآن' : 'Just now';
    if (diffSec < 60) return isAr ? `منذ ${diffSec}ث` : `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return isAr ? `منذ ${diffMin}د` : `${diffMin}m ago`;
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const fetchMetrics = async (isManual = false, forceRescan = false) => {
    if (isManual) setRefreshing(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    try {
      const qs = forceRescan ? `rescan=1&t=${Date.now()}` : `t=${Date.now()}`;
      const res = await fetch(`/api/admin/cluster-metrics?${qs}`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(isAr ? 'تعذر الاتصال بخادم المراقبة' : 'Failed to load cluster metrics');
      const data = await res.json();
      setMetrics(data);
      setError(null);
      if (forceRescan) {
        const count = Array.isArray(data?.apiPool) ? data.apiPool.length : (data?.apiPool?.keys?.length || 0);
        showToast(isAr ? `تمت إعادة الفحص بنجاح (${count} مفاتيح نشطة)` : `Rescanned successfully (${count} active keys)`);
      } else if (isManual) {
        showToast(isAr ? 'تم تحديث البيانات بنجاح' : 'Telemetry synced');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setError(isAr ? 'انتهت مهلة الاتصال بالخادم (تحقق من تشغيل الخدمة)' : 'Server metrics request timed out');
      } else {
        setError(err.message);
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      if (isManual) {
        setTimeout(() => setRefreshing(false), 300);
      }
    }
  };

  const handleRescanKeys = async () => {
    setRescanning(true);
    setError(null);
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 4000);
      await fetch('/api/admin/gemini-keys/rescan', { method: 'POST', signal: ctrl.signal }).catch(() => {});
      clearTimeout(tid);
      await fetchMetrics(true, true);
    } finally {
      setRescanning(false);
    }
  };

  useEffect(() => {
    fetchMetrics(false, false);
    const interval = setInterval(() => fetchMetrics(false, false), 4000);
    return () => clearInterval(interval);
  }, []);

  const handleAddKey = async (e) => {
    e.preventDefault();
    if (!newKey.trim()) return;
    setAddingKey(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/gemini-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: newKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (isAr ? 'فشل إضافة المفتاح' : 'Failed to add key'));
      }
      setNewKey('');
      showToast(
        isAr
          ? `تم حفظ المفاتيح بنجاح (الإجمالي: ${data.totalKeys || ''})`
          : `Saved to pool (${data.totalKeys || ''} keys active)`
      );
      await fetchMetrics(true, false);
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingKey(false);
    }
  };

  const handleRemoveKey = async (id) => {
    if (!window.confirm(isAr ? 'هل أنت متأكد من حذف هذا المفتاح؟' : 'Remove this API key from the pool?')) return;
    try {
      await fetch(`/api/admin/gemini-keys/${id}`, { method: 'DELETE' });
      showToast(isAr ? 'تم حذف المفتاح' : 'API key removed');
      await fetchMetrics(true, false);
    } catch (err) {
      setError(err.message);
    }
  };

  const poolKeys = Array.isArray(metrics?.apiPool) ? metrics.apiPool : (metrics?.apiPool?.keys || []);
  const storageStatus = metrics?.storage || {};
  const activeKeyCount = poolKeys.filter((k) => k.activeRequests > 0).length;

  return (
    <div className="space-y-6 animate-fade-in-up" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Compact Subheader Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-purple-500/20 px-4 py-3 rounded-2xl">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-black text-white">
            {isAr ? 'مراقبة السيرفر والتخزين السحابي (V2 Cluster)' : 'Live Cluster & Cloud Storage Telemetry'}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {toastMsg && (
            <span className="text-xs font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-3 py-1 rounded-xl whitespace-nowrap">
              {toastMsg}
            </span>
          )}
          <button
            onClick={() => fetchMetrics(true, false)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-950 hover:bg-purple-950/60 border border-purple-500/30 hover:border-pink-500/50 rounded-xl text-xs font-bold text-purple-200 hover:text-white transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${refreshing ? 'animate-spin text-pink-400' : ''}`} />
            <span>{isAr ? (refreshing ? 'جاري التحديث...' : 'تحديث فوري') : (refreshing ? 'Syncing...' : 'Live Sync')}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-950/60 border border-red-500/40 rounded-2xl flex items-center gap-2.5 text-red-200 text-xs font-bold">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* 5-Column Compact Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Active Jobs */}
        <div className="bg-slate-900/80 border border-purple-500/20 rounded-2xl p-4 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-slate-400 whitespace-nowrap">{isAr ? 'المهام النشطة' : 'Active Jobs'}</span>
            <Cpu className="w-4 h-4 text-indigo-400 shrink-0" />
          </div>
          <div className="text-2xl font-black text-white">
            {metrics?.queue?.active ?? 0}
          </div>
          <span className="text-[11px] text-indigo-300/80 mt-1 truncate">
            {isAr ? 'قيد المعالجة' : 'Processing now'}
          </span>
        </div>

        {/* Waiting Jobs */}
        <div className="bg-slate-900/80 border border-purple-500/20 rounded-2xl p-4 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-slate-400 whitespace-nowrap">{isAr ? 'في الانتظار' : 'Queued'}</span>
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {metrics?.queue?.waiting ?? 0}
          </div>
          <span className="text-[11px] text-amber-300/80 mt-1 truncate">
            {isAr ? 'طابور الانتظار' : 'Waiting in queue'}
          </span>
        </div>

        {/* Completed Jobs */}
        <div className="bg-slate-900/80 border border-purple-500/20 rounded-2xl p-4 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-slate-400 whitespace-nowrap">{isAr ? 'المكتملة' : 'Completed'}</span>
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {metrics?.queue?.completed ?? 0}
          </div>
          <span className="text-[11px] text-emerald-300/80 mt-1 truncate">
            {isAr ? 'تمت بنجاح' : 'Finished jobs'}
          </span>
        </div>

        {/* Cloudflare R2 Storage */}
        <div className={`border rounded-2xl p-4 shadow-md flex flex-col justify-between ${
          storageStatus.configured
            ? 'bg-slate-900/80 border-emerald-500/30'
            : 'bg-amber-950/20 border-amber-500/30'
        }`}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-slate-400 whitespace-nowrap">{isAr ? 'التخزين السحابي' : 'Cloud Storage'}</span>
            <Cloud className={`w-4 h-4 shrink-0 ${storageStatus.configured ? 'text-emerald-400' : 'text-amber-400'}`} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${storageStatus.configured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className="text-sm font-black text-white whitespace-nowrap">
              {storageStatus.configured ? 'Cloudflare R2' : 'Local Disk'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 truncate" title={storageStatus.missingKeys?.join(', ')}>
            {storageStatus.configured
              ? (storageStatus.bucketName || 'subtie-vault')
              : (storageStatus.missingKeys?.length > 0 ? `Missing: ${storageStatus.missingKeys[0]}` : 'Fallback Mode')}
          </span>
        </div>

        {/* Redis Status */}
        <div className="bg-slate-900/80 border border-purple-500/20 rounded-2xl p-4 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-slate-400 whitespace-nowrap">{isAr ? 'محرك الطابور' : 'Redis Broker'}</span>
            <Server className="w-4 h-4 text-pink-400 shrink-0" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${metrics?.queue?.status === 'online' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className="text-sm font-black text-white whitespace-nowrap">
              {metrics?.queue?.status === 'online' ? 'Connected' : 'Standalone'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 truncate">
            {metrics?.queue?.host || 'Port 6380'}
          </span>
        </div>
      </div>

      {/* Gemini API Key Pool Card */}
      <div className="bg-slate-900/90 border border-purple-500/30 rounded-2xl p-5 shadow-xl space-y-5">
        {/* Clean Toolbar Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-purple-500/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/25 border border-purple-500/40 flex items-center justify-center shrink-0">
              <Key className="w-4 h-4 text-purple-300" />
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base font-black text-white whitespace-nowrap">
                {isAr ? 'مجمع مفاتيح Gemini AI' : 'Gemini AI Key Pool'}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-xs font-black text-purple-200 whitespace-nowrap">
                {poolKeys.length} {isAr ? 'مفتاح' : 'Keys'}
              </span>
              {activeKeyCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 border border-pink-500/40 text-xs font-black text-pink-300 animate-pulse whitespace-nowrap">
                  {activeKeyCount} {isAr ? 'قيد الاستخدام الآن' : 'In Use Now'}
                </span>
              )}
            </div>
          </div>

          {/* Controls: Input + Add + Rescan */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <form onSubmit={handleAddKey} className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="password"
                placeholder={isAr ? 'الصق مفتاحاً أو عدة مفاتيح مفصولة بفاصلة...' : 'Paste 1 or comma-separated keys...'}
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="w-full sm:w-64 bg-slate-950 border border-purple-500/30 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
              />
              <button
                type="submit"
                disabled={addingKey}
                className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-black rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>{isAr ? 'إضافة مفتاح' : 'Add Key'}</span>
              </button>
            </form>

            <button
              onClick={handleRescanKeys}
              disabled={rescanning}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-purple-500/30 text-purple-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
              title={isAr ? 'إعادة فحص متغيرات البيئة' : 'Rescan Environment Variables'}
            >
              <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${rescanning ? 'animate-spin text-pink-400' : ''}`} />
              <span>{isAr ? 'إعادة فحص' : 'Rescan Env'}</span>
            </button>
          </div>
        </div>

        {/* Keys Table */}
        <div className="overflow-x-auto rounded-xl border border-purple-500/15 bg-slate-950/50">
          <table className="w-full text-left rtl:text-right text-xs">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-purple-500/20">
              <tr>
                <th className="py-3 px-4 font-extrabold whitespace-nowrap">#</th>
                <th className="py-3 px-4 font-extrabold whitespace-nowrap">{isAr ? 'المفتاح' : 'API Key'}</th>
                <th className="py-3 px-4 font-extrabold whitespace-nowrap">{isAr ? 'الحالة' : 'Status'}</th>
                <th className="py-3 px-4 font-extrabold whitespace-nowrap text-center">{isAr ? 'النشطة الآن' : 'In Flight'}</th>
                <th className="py-3 px-4 font-extrabold whitespace-nowrap text-center">{isAr ? 'إجمالي الطلبات' : 'Total Calls'}</th>
                <th className="py-3 px-4 font-extrabold whitespace-nowrap text-center">{isAr ? 'آخر استخدام' : 'Last Used'}</th>
                <th className="py-3 px-4 font-extrabold whitespace-nowrap text-center">{isAr ? 'التهدئة' : 'Cooldown'}</th>
                <th className="py-3 px-4 font-extrabold whitespace-nowrap text-center">{isAr ? 'حذف' : 'Remove'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-500/10">
              {poolKeys.map((key, idx) => {
                const isBusy = key.activeRequests > 0;
                return (
                  <tr
                    key={key.id}
                    className={`transition ${
                      isBusy
                        ? 'bg-pink-950/30 hover:bg-pink-950/40'
                        : key.isLastUsed
                        ? 'bg-purple-950/20 hover:bg-purple-950/30'
                        : 'hover:bg-purple-950/25'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono text-slate-500 font-bold">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isBusy
                              ? 'bg-pink-400 animate-ping'
                              : key.isLastUsed
                              ? 'bg-emerald-400'
                              : 'bg-purple-400'
                          }`}
                        />
                        <span>{key.maskedKey}</span>
                        {isBusy && (
                          <span className="px-2 py-0.5 rounded-md bg-pink-500/25 border border-pink-500/50 text-[10px] font-black text-pink-300 uppercase tracking-wider animate-pulse">
                            {isAr ? 'يعمل الآن' : 'IN USE'}
                          </span>
                        )}
                        {!isBusy && key.isLastUsed && (
                          <span className="px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/40 text-[10px] font-bold text-purple-300 uppercase">
                            {isAr ? 'آخر مفتاح مستخدم' : 'LAST CALLED'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          key.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : key.status === 'rate_limited'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {key.status === 'active' ? (isAr ? 'نشط' : 'Active') : key.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-center">
                      <span className={isBusy ? 'text-pink-400 font-black' : 'text-slate-400'}>
                        {key.activeRequests}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-200 text-center">{key.totalRequests}</td>
                    <td className="py-3 px-4 text-slate-300 font-mono text-center whitespace-nowrap">
                      {formatLastUsed(key.lastUsed)}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-center">
                      {key.cooldownSecondsRemaining > 0 ? (
                        <span className="text-amber-400 font-bold">{key.cooldownSecondsRemaining}s</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleRemoveKey(key.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition cursor-pointer"
                        title={isAr ? 'حذف المفتاح' : 'Delete key'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {poolKeys.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-8 px-4 text-center text-slate-400">
                    <p className="font-bold text-xs text-slate-300">
                      {isAr ? 'لا توجد مفاتيح مضافة حالياً — الصق مفاتيحك في الحقل أعلاه أو اضغط "إعادة فحص".' : 'No API keys in pool — paste your key(s) above or click "Rescan Env".'}
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
