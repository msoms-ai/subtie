import React, { useState, useEffect } from 'react';
import { Search, Trash2, Edit3, Film, Sparkles, AlertTriangle, CheckCircle2, PlusCircle, Tv, Video, Layers, Filter, UserCheck, Shield } from 'lucide-react';

export default function ProjectsGallery({ onEditProject, onStartWizard, onOpenAssignAuditor, user, lang = 'en' }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all'); // 'all', 'episode', 'movie', 'trailer', 'clip'
  
  // Deletion modal states
  const [deletingProjectId, setDeletingProjectId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const headers = user?.id ? { 'x-user-id': user.id } : {};
      const res = await fetch('/api/projects', { cache: 'no-store', headers });
      const data = await res.json();
      if (Array.isArray(data)) {
        setProjects(data);
      } else if (data.success) {
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error('Failed to fetch projects gallery:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const handleDeleteConfirm = async () => {
    if (!deletingProjectId) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/project/${deletingProjectId}`, {
        method: 'DELETE',
        headers: user?.id ? { 'x-user-id': user.id } : {}
      });
      const data = await res.json();

      if (data.success) {
        setDeletingProjectId(null);
        setToastMsg(lang === 'ar' ? 'تم حذف المشروع وجميع ملفاته بنجاح' : 'Deletion Completed Successfully. All files deleted.');
        setTimeout(() => setToastMsg(null), 4000);
        fetchProjects();
      } else {
        alert(data.error || 'Failed to delete project.');
      }
    } catch (err) {
      console.error('Delete project error:', err);
      alert('Network error while deleting project.');
    } finally {
      setIsDeleting(false);
    }
  };

  const isAr = lang === 'ar';

  // Arabic category translation helper
  const getCategoryLabel = (type) => {
    const t = String(type || 'Episode').toLowerCase();
    if (t.includes('movie') || t.includes('فيلم')) return isAr ? 'فيلم سينمائي' : 'Feature Movie';
    if (t.includes('trailer') || t.includes('تريلر') || t.includes('عرض')) return isAr ? 'تريلر ترويجي' : 'Teaser / Trailer';
    if (t.includes('clip') || t.includes('مقطع')) return isAr ? 'مقطع فيديو' : 'Short Video Clip';
    return isAr ? 'حلقة أنمي' : 'Anime Episode';
  };

  // Category Icon helper
  const getCategoryIcon = (type) => {
    const t = String(type || 'Episode').toLowerCase();
    if (t.includes('movie') || t.includes('فيلم')) return <Video className="w-4 h-4 text-pink-300" />;
    if (t.includes('trailer') || t.includes('تريلر') || t.includes('عرض')) return <Sparkles className="w-4 h-4 text-amber-300" />;
    if (t.includes('clip') || t.includes('مقطع')) return <Layers className="w-4 h-4 text-indigo-300" />;
    return <Tv className="w-4 h-4 text-purple-300" />;
  };

  // Filter projects by category & search query
  const filteredProjects = projects.filter(p => {
    const matchesSearch =
      (p.projectName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.mediaTitle || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    if (activeCategoryFilter === 'all') return true;

    const pType = String(p.projectType || 'Episode').toLowerCase();
    if (activeCategoryFilter === 'episode') return pType.includes('episode') || pType.includes('حلقة');
    if (activeCategoryFilter === 'movie') return pType.includes('movie') || pType.includes('فيلم');
    if (activeCategoryFilter === 'trailer') return pType.includes('trailer') || pType.includes('تريلر') || pType.includes('عرض');
    if (activeCategoryFilter === 'clip') return pType.includes('clip') || pType.includes('مقطع');
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-emerald-600 text-white shadow-2xl border border-emerald-400 flex items-center space-x-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span className="text-xs sm:text-sm font-bold">{toastMsg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-purple-500/20 pb-6" dir={isAr ? 'rtl' : 'ltr'}>
        <div>
          <div className="inline-flex items-center space-x-2 rtl:space-x-reverse bg-purple-950 theme-light:bg-purple-700 text-white px-3.5 py-1.5 rounded-full border border-purple-500/40 theme-light:border-purple-800 text-xs font-black shadow-sm mb-2 wizard-white-text">
            <Film className="w-4 h-4 text-pink-400 theme-light:text-yellow-300" />
            <span>{isAr ? 'معرض المشاريع الترجمية' : 'Anime Subtitle Projects Gallery'}</span>
          </div>
          <h2 className="text-3xl font-black text-white theme-light:text-slate-950">
            {isAr ? 'جميع مشاريع الترجمة' : 'All Subtitle Projects'}
          </h2>
          <p className="text-xs sm:text-sm text-purple-300 theme-light:text-purple-950 mt-1 font-bold">
            {isAr ? 'إدارة وتصفح وتحرير جميع مقاطع الفيديو والملفات الترجمية الخاصة بك' : 'Manage, edit, export, and delete all saved anime fansub projects and media files.'}
          </p>
        </div>

        <div className="flex items-center space-x-3 rtl:space-x-reverse w-full md:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 md:w-72">
            <Search className={`w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-3' : 'left-3'}`} />
            <input
              type="text"
              dir={isAr ? 'rtl' : 'ltr'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث باسم المشروع أو الفيديو...' : 'Search projects or video title...'}
              className={`w-full bg-slate-900 theme-light:bg-white border border-slate-700 theme-light:border-purple-400 focus:border-purple-500 rounded-2xl text-xs text-white theme-light:text-slate-950 font-bold outline-none transition ${isAr ? 'pr-9 pl-4' : 'pl-9 pr-4'} py-3 shadow-sm`}
            />
          </div>

          {/* Create New Project Button (Translators & Admins) */}
          {(!user || user.role !== 'Auditor') && (
            <button
              onClick={onStartWizard}
              className="flex items-center space-x-2 rtl:space-x-reverse px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:scale-105 text-white font-black text-xs sm:text-sm shadow-xl shadow-purple-500/25 shrink-0 transition wizard-white-text border border-purple-400/40"
            >
              <PlusCircle className="w-4.5 h-4.5 text-pink-200" />
              <span>{isAr ? 'مشروع جديد' : 'New Project'}</span>
            </button>
          )}
        </div>
      </div>

      {/* CATEGORY FILTER TABS BAR */}
      <div className="flex items-center space-x-2 rtl:space-x-reverse overflow-x-auto pb-2" dir={isAr ? 'rtl' : 'ltr'}>
        <span className="text-xs font-black text-purple-300 theme-light:text-purple-950 flex items-center space-x-1 rtl:space-x-reverse shrink-0 px-2">
          <Filter className="w-3.5 h-3.5 text-pink-400 theme-light:text-purple-700" />
          <span>{isAr ? 'التصفية حسب الفئة:' : 'Filter by Category:'}</span>
        </span>

        {[
          { id: 'all', labelAr: 'جميع المشاريع', labelEn: 'All Projects' },
          { id: 'episode', labelAr: 'حلقات الأنمي', labelEn: 'Anime Episodes' },
          { id: 'movie', labelAr: 'الأفلام السينمائية', labelEn: 'Feature Movies' },
          { id: 'trailer', labelAr: 'العروض الترويجية', labelEn: 'Teasers & Trailers' },
          { id: 'clip', labelAr: 'مقاطع الفيديو', labelEn: 'Short Clips' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCategoryFilter(tab.id)}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition shrink-0 border ${
              activeCategoryFilter === tab.id
                ? 'bg-gradient-to-r from-purple-700 via-pink-600 to-indigo-700 text-white border-purple-400 shadow-md wizard-white-text'
                : 'bg-purple-950 theme-light:bg-purple-800 text-white border-purple-500/40 theme-light:border-purple-600 hover:bg-purple-800 wizard-white-text'
            }`}
          >
            {isAr ? tab.labelAr : tab.labelEn}
          </button>
        ))}
      </div>

      {/* Projects Grid Layout */}
      {loading ? (
        <div className="text-center py-20 text-purple-300">
          <Sparkles className="w-10 h-10 animate-spin mx-auto mb-3 text-purple-400" />
          <p className="text-sm font-black text-white theme-light:text-slate-950">{isAr ? 'جاري تحميل قائمة مشاريعك...' : 'Loading project gallery...'}</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center border border-purple-500/30 space-y-5 max-w-lg mx-auto shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-purple-950 theme-light:bg-purple-800 border-2 border-purple-400 flex items-center justify-center text-pink-300">
            <Film className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-white theme-light:text-slate-950">
            {isAr ? 'لا توجد مشاريع حتى الآن' : 'No Subtitle Projects Found'}
          </h3>
          <p className="text-xs text-purple-300 theme-light:text-purple-950 font-extrabold leading-relaxed">
            {searchQuery
              ? (isAr ? 'لم يتم العثور على نتائج تطابق البحث المدخل' : 'No projects match your search query.')
              : (isAr ? 'ابدأ بإنشاء أول مشروع ترجمة أنمي الآن وافتح محرر التزامن المتقدم!' : 'Get started by creating your first video fansub project!')}
          </p>
          {(!user || user.role !== 'Auditor') && (
            <button
              onClick={onStartWizard}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-xs sm:text-sm shadow-xl wizard-white-text border border-purple-400/40"
            >
              {isAr ? 'إنشاء مشروع جديد الآن' : 'Create Project Now'}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((p) => {
            const lineCount = p.subtitles?.length || 0;
            const approvedCount = p.subtitles?.filter(s => s.approved)?.length || 0;
            const progressPercent = lineCount > 0 ? Math.round((approvedCount / lineCount) * 100) : 0;
            const isAuditorAssigned = p.auditorId && user?.id === p.auditorId;

            return (
              <div
                key={p.id}
                className="glass-panel-glow p-6 rounded-3xl border border-purple-500/30 hover:border-purple-400 transition-all duration-300 shadow-xl flex flex-col justify-between space-y-5 text-center items-center group relative overflow-hidden"
              >
                <div className="w-full space-y-3">
                  
                  {/* Top Badge & Actions */}
                  <div className="flex items-center justify-between w-full" dir={isAr ? 'rtl' : 'ltr'}>
                    <div className="inline-flex items-center space-x-1.5 rtl:space-x-reverse bg-purple-950 theme-light:bg-purple-800 px-3.5 py-1.5 rounded-full border-2 border-purple-400 shadow-sm text-xs font-black text-white wizard-white-text">
                      {getCategoryIcon(p.projectType)}
                      <span>{getCategoryLabel(p.projectType)}</span>
                    </div>

                    {/* Delete Icon (Admins & Owners) */}
                    {(!user || user.role === 'Admin' || user.id === p.ownerId) && (
                      <button
                        onClick={() => setDeletingProjectId(p.id)}
                        className="p-2 rounded-xl bg-rose-950/60 theme-light:bg-rose-600 text-white border border-rose-500/40 hover:scale-110 transition shadow-sm wizard-white-text"
                        title={isAr ? 'حذف المشروع' : 'Delete Project'}
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    )}
                  </div>

                  {/* Owner & Auditor Badges */}
                  <div className="flex items-center justify-between text-[11px] font-black pt-1" dir={isAr ? 'rtl' : 'ltr'}>
                    <span className="text-purple-300 theme-light:text-purple-900">
                      👤 {p.ownerName || (isAr ? 'مالك المشروع' : 'Owner')}
                    </span>
                    {p.auditorName ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        🔍 {isAr ? 'المدقق:' : 'Auditor:'} {p.auditorName}
                      </span>
                    ) : (
                      (!user || user.role !== 'Auditor') && (
                        <button
                          onClick={() => onOpenAssignAuditor(p)}
                          className="text-pink-400 hover:text-pink-300 font-bold underline flex items-center space-x-1 rtl:space-x-reverse"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{isAr ? 'تعيين مدقق' : 'Assign Auditor'}</span>
                        </button>
                      )
                    )}
                  </div>

                  {/* Project Titles */}
                  <div className="text-center pt-1" dir={isAr ? 'rtl' : 'ltr'}>
                    <h3 className="text-xl font-black text-white theme-light:text-slate-950 group-hover:text-pink-300 theme-light:group-hover:text-purple-700 transition truncate">
                      {p.projectName}
                    </h3>
                    <p className="text-xs font-extrabold text-purple-300 theme-light:text-purple-950 truncate mt-1">
                      {p.mediaTitle}
                    </p>
                  </div>

                  {/* Approved Lines Progress Bar */}
                  <div className="space-y-1.5 pt-2" dir={isAr ? 'rtl' : 'ltr'}>
                    <div className="flex items-center justify-between text-[11px] font-black text-purple-300 theme-light:text-purple-950">
                      <span>{isAr ? 'نسبة اعتماد الترجمة:' : 'Approved Translation:'}</span>
                      <span className="text-emerald-400 theme-light:text-emerald-800 font-mono font-black">{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-950 theme-light:bg-purple-200 h-2.5 rounded-full overflow-hidden border border-purple-500/30">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                </div>

                {/* Subtitle Stats Boxes */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-purple-500/20 w-full" dir={isAr ? 'rtl' : 'ltr'}>
                  <div className="bg-purple-950 theme-light:bg-purple-800 p-3 rounded-2xl border-2 border-purple-400/80 shadow-md flex flex-col items-center justify-center text-center wizard-white-text">
                    <span className="text-[11px] text-purple-200 font-bold block mb-0.5 text-center">{isAr ? 'أسطر الترجمة' : 'Total Lines'}</span>
                    <span className="font-mono text-sm font-black text-white text-center block">{lineCount} {isAr ? 'سطر' : 'lines'}</span>
                  </div>
                  
                  <div className="bg-purple-950 theme-light:bg-purple-800 p-3 rounded-2xl border-2 border-purple-400/80 shadow-md flex flex-col items-center justify-center text-center wizard-white-text">
                    <span className="text-[11px] text-purple-200 font-bold block mb-0.5 text-center">{isAr ? 'أسطر معتمدة' : 'Approved'}</span>
                    <span className="font-mono text-sm font-black text-emerald-300 text-center block">{approvedCount}/{lineCount}</span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => onEditProject(p)}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:scale-[1.02] text-white font-black text-xs sm:text-sm shadow-xl shadow-purple-500/25 flex items-center justify-center space-x-2 rtl:space-x-reverse transition wizard-white-text border border-purple-400/40"
                >
                  <Edit3 className="w-4 h-4 text-pink-200" />
                  <span>
                    {isAuditorAssigned
                      ? (isAr ? 'مراجعة وتدقيق المشروع (Auditor Workspace)' : 'Review & Audit Subtitles')
                      : (isAr ? 'فتح المحرر ومساحة العمل' : 'Open Subtitle Workspace')}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingProjectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-md glass-panel p-6 sm:p-8 rounded-3xl border border-rose-500/40 text-center space-y-5 shadow-2xl animate-fade-in">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-black text-white theme-light:text-slate-950">
                {isAr ? 'تأكيد حذف المشروع' : 'Confirm Project Deletion'}
              </h3>
              <p className="text-xs text-rose-300 theme-light:text-rose-700 mt-2 leading-relaxed font-bold">
                {isAr
                  ? 'هل أنت تأكد من أنك تريد حذف هذا المشروع؟ سيتم حذف جميع الملفات نهائياً بما في ذلك الفيديو والصوت وملف الترجمة.'
                  : 'Are you sure you want to delete this project? All associated media files (video, audio track, and SRT subtitles) will be permanently deleted from the server.'}
              </p>
            </div>

            <div className="flex items-center space-x-3 rtl:space-x-reverse pt-2">
              <button
                disabled={isDeleting}
                onClick={() => setDeletingProjectId(null)}
                className="flex-1 py-3 bg-purple-950 theme-light:bg-slate-200 border border-purple-500/40 theme-light:border-slate-300 text-white theme-light:text-slate-900 rounded-xl text-xs font-black transition"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-500/30 transition flex items-center justify-center space-x-1.5 wizard-white-text"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? (isAr ? 'جاري الحذف...' : 'Deleting...') : (isAr ? 'حذف المشروع' : 'Delete Project')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
