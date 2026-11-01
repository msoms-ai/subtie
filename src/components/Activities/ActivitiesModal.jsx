import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  X,
  RefreshCw,
  Radio,
  FileVideo,
  Link as LinkIcon,
  Cpu,
  Eye,
  Users,
  CheckCircle2,
  AlertTriangle,
  Play,
  Clock,
  Layers,
  Trash2,
  Sparkles,
  ExternalLink
} from 'lucide-react';

export default function ActivitiesModal({
  isOpen,
  onClose,
  onOpenProject,
  user,
  lang = 'ar'
}) {
  const isAr = lang === 'ar';
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  const fetchActivities = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch('/api/activities', {
        headers: { 'x-user-id': user.id },
        cache: 'no-store'
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.success && Array.isArray(data.activities)) {
        setActivities(data.activities);
      }
    } catch (err) {
      console.warn('Failed to fetch ongoing activities:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isOpen) return;
    fetchActivities();
    const interval = setInterval(fetchActivities, 2500);
    return () => clearInterval(interval);
  }, [isOpen, fetchActivities]);

  const handleCancelActivity = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm(isAr ? 'هل أنت متأكد من إلغاء هذه المهمة وحذف ملفاتها المؤقتة؟' : 'Are you sure you want to cancel this task and discard partial data?')) {
      return;
    }

    setCancellingId(id);
    try {
      const res = await fetch(`/api/activities/${id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id
        }
      });
      if (res.ok) {
        fetchActivities();
      }
    } catch (err) {
      console.error('Cancel error:', err);
    } finally {
      setCancellingId(null);
    }
  };

  const handleOpenWorkspace = async (projectId, e) => {
    if (e?.stopPropagation) e.stopPropagation();
    try {
      const res = await fetch(`/api/project/${projectId}`, {
        headers: user?.id ? { 'x-user-id': user.id } : {}
      });
      const data = await res.json();
      if (data && data.id && !data.error) {
        onClose();
        if (typeof onOpenProject === 'function') {
          onOpenProject(data);
        }
      }
    } catch (err) {
      console.error('Open project error:', err);
    }
  };

  if (!isOpen) return null;

  const activeTasks = activities.filter(a => a.status === 'downloading' || a.status === 'processing');
  const completedTasks = activities.filter(a => a.status === 'ready' || a.status === 'Completed' || a.progress === 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-[2rem] bg-slate-950 theme-light:bg-white border-2 border-purple-500/40 theme-light:border-purple-400 shadow-2xl shadow-purple-950/70 overflow-hidden">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-purple-500/20 theme-light:border-purple-200 bg-slate-900/60 theme-light:bg-purple-50/70">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
              <Activity className="w-5 h-5 animate-pulse" />
              {activeTasks.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 animate-ping" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-black text-white theme-light:text-slate-950 flex items-center space-x-2 rtl:space-x-reverse">
                <span>{isAr ? 'المهام الجارية والنشاطات' : 'Ongoing Tasks & Activities'}</span>
                {activeTasks.length > 0 && (
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 theme-light:bg-pink-100 theme-light:text-pink-900 border border-pink-400/30">
                    {activeTasks.length} {isAr ? 'نشطة' : 'Active'}
                  </span>
                )}
              </h3>
              <p className="text-xs text-purple-300 theme-light:text-purple-900 font-bold">
                {isAr ? 'متابعة تنزيل التورنت والمعالجة الذكية في الخلفية بالوقت الفعلي' : 'Real-time monitoring of torrent downloads and AI fansub pipelines'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <button
              onClick={fetchActivities}
              className="p-2 rounded-xl bg-purple-900/40 theme-light:bg-purple-100 text-purple-300 theme-light:text-purple-900 hover:scale-105 transition cursor-pointer"
              title={isAr ? 'تحديث النشاطات' : 'Refresh'}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 theme-light:bg-slate-200 text-slate-400 theme-light:text-slate-700 hover:text-white theme-light:hover:text-black transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {loading && activities.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 mx-auto text-purple-400 animate-spin" />
              <p className="text-xs font-bold text-slate-400 theme-light:text-slate-600">
                {isAr ? 'جاري فحص المهام النشطة...' : 'Checking active tasks...'}
              </p>
            </div>
          ) : activities.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-purple-900/30 theme-light:bg-purple-100 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400 theme-light:text-purple-700">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-base font-black text-white theme-light:text-slate-950">
                {isAr ? 'لا توجد مهام نشطة حالياً' : 'No Active Tasks in Background'}
              </h4>
              <p className="text-xs text-slate-400 theme-light:text-slate-600 font-bold max-w-sm mx-auto leading-relaxed">
                {isAr
                  ? 'جميع مشاريعك تم الانتهاء منها وهي جاهزة للعمل في صفحة المشاريع. يمكنك بدء مشروع تورنت أو رفع جديد في أي وقت!'
                  : 'All your projects have completed. You can start a new torrent or direct video upload at any time!'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((act) => {
                const isDownloading = act.status === 'downloading';
                const isProcessing = act.status === 'processing';
                const isReady = act.canOpen || act.status === 'ready' || act.progress === 100;

                return (
                  <div
                    key={act.id}
                    className={`rounded-2xl p-5 border transition shadow-lg ${
                      isReady
                        ? 'bg-purple-950/30 theme-light:bg-emerald-50/70 border-emerald-500/40 theme-light:border-emerald-300'
                        : 'bg-slate-900/70 theme-light:bg-purple-50/80 border-purple-500/30 theme-light:border-purple-300'
                    }`}
                  >
                    {/* Top Row: Title, Category & Status Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center space-x-2.5 rtl:space-x-reverse min-w-0">
                        <div className={`p-2 rounded-xl shrink-0 ${
                          isDownloading
                            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                            : isReady
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                        }`}>
                          {isDownloading ? <Radio className="w-4 h-4 animate-pulse" /> : isReady ? <CheckCircle2 className="w-4 h-4" /> : <Cpu className="w-4 h-4 animate-spin" />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-white theme-light:text-slate-950 truncate max-w-md">
                            {act.mediaTitle || act.projectName}
                          </h4>
                          <span className="text-[11px] font-extrabold text-purple-300 theme-light:text-purple-900">
                            📁 {act.projectName}
                          </span>
                        </div>
                      </div>

                      {/* Status / Stage Pill */}
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                          isReady
                            ? 'bg-emerald-950/80 theme-light:bg-emerald-100 text-emerald-300 theme-light:text-emerald-900 border-emerald-400/40'
                            : isDownloading
                            ? 'bg-sky-950/80 theme-light:bg-sky-100 text-sky-300 theme-light:text-sky-900 border-sky-400/40'
                            : 'bg-purple-950/80 theme-light:bg-purple-100 text-purple-300 theme-light:text-purple-900 border-purple-400/40'
                        }`}>
                          {isReady
                            ? (isAr ? 'جاهز للترجمة' : 'Ready')
                            : isDownloading
                            ? (isAr ? 'تحميل التورنت' : 'Downloading Torrent')
                            : (isAr ? 'معالجة بالذكاء الاصطناعي' : 'AI Processing')}
                        </span>

                        {/* Estimated Time Badge */}
                        <div className="flex items-center space-x-1 rtl:space-x-reverse text-[11px] font-black text-amber-300 theme-light:text-amber-900 bg-amber-950/60 theme-light:bg-amber-100 px-2.5 py-1 rounded-full border border-amber-400/30">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{act.eta || '--'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Torrent Telemetry Strip (if downloading) */}
                    {isDownloading && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 bg-slate-950/60 theme-light:bg-purple-100/90 p-2.5 rounded-xl border border-purple-500/20 theme-light:border-purple-300 text-xs font-black" dir="ltr">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 theme-light:text-purple-900 block">Speed</span>
                          <span className="text-white theme-light:text-slate-950">{act.speed || '0.00 MB/s'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 theme-light:text-purple-900 block">Downloaded</span>
                          <span className="text-pink-300 theme-light:text-purple-800">{act.downloadedMb || 0} / {act.totalMb || 0} MB</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 theme-light:text-purple-900 block">Peers / Seeds</span>
                          <span className="text-emerald-400 theme-light:text-emerald-700">{act.numPeers || 0} peers ({act.numSeeds || 0} seeds)</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 theme-light:text-purple-900 block">ETA</span>
                          <span className="text-white theme-light:text-slate-950">{act.eta || '--'}</span>
                        </div>
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div className="space-y-1.5 mb-3">
                      <div className="w-full h-3 bg-slate-900 theme-light:bg-purple-200 rounded-full border border-purple-500/20 overflow-hidden p-0.5">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isReady
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : 'bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-500 shimmer-bar'
                          }`}
                          style={{ width: `${act.progress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs font-black">
                        <span className="text-purple-300 theme-light:text-purple-900 truncate max-w-xs">
                          {act.stageDescription}
                        </span>
                        <span className="text-white theme-light:text-slate-950 font-black">
                          {act.progress}%
                        </span>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-purple-500/10 theme-light:border-purple-200">
                      <span className="text-[11px] font-bold text-slate-400 theme-light:text-purple-900">
                        {new Date(act.updatedAt || act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        {!isReady && (
                          <button
                            type="button"
                            disabled={cancellingId === act.id}
                            onClick={(e) => handleCancelActivity(act.id, e)}
                            className="flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1.5 rounded-xl bg-rose-950/40 theme-light:bg-rose-100 hover:bg-rose-900/60 text-rose-300 theme-light:text-rose-800 text-xs font-black border border-rose-500/30 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{cancellingId === act.id ? (isAr ? 'جاري الإلغاء...' : 'Cancelling...') : (isAr ? 'إلغاء' : 'Cancel')}</span>
                          </button>
                        )}

                        {isReady ? (
                          <button
                            type="button"
                            onClick={(e) => handleOpenWorkspace(act.projectId, e)}
                            className="flex items-center space-x-1.5 rtl:space-x-reverse px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:scale-105 text-white font-black text-xs shadow-lg shadow-emerald-500/30 border border-emerald-400 transition cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>{isAr ? 'فتح في محرر الترجمة' : 'Open in Workspace'}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleOpenWorkspace(act.projectId, e)}
                            className="flex items-center space-x-1.5 rtl:space-x-reverse px-4 py-1.5 rounded-xl bg-purple-900/60 theme-light:bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs border border-purple-400/40 shadow-sm transition cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>{isAr ? 'فحص السجل' : 'Inspect Log'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-900/60 theme-light:bg-purple-50/70 border-t border-purple-500/20 theme-light:border-purple-200 flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 theme-light:text-purple-900">
            {isAr ? 'يتم التحديث تلقائياً كل ثانيتين ونصف' : 'Auto-updates every 2.5s'}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 theme-light:bg-slate-200 hover:bg-slate-700 text-white theme-light:text-slate-900 font-black text-xs transition cursor-pointer"
          >
            {isAr ? 'إغلاق النافذة' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
}
