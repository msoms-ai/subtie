import React, { useState, useEffect } from 'react';
import { Search, Trash2, Edit3, Film, Sparkles, AlertTriangle, CheckCircle2, PlusCircle } from 'lucide-react';

export default function ProjectsGallery({ onEditProject, onStartWizard, lang = 'en' }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Deletion modal states
  const [deletingProjectId, setDeletingProjectId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.success) {
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
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deletingProjectId) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/project/${deletingProjectId}`, {
        method: 'DELETE'
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

  const filteredProjects = projects.filter(p =>
    (p.projectName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.mediaTitle || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isAr = lang === 'ar';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-emerald-600 text-white shadow-2xl border border-emerald-400 flex items-center space-x-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span className="text-xs sm:text-sm font-bold">{toastMsg}</span>
        </div>
      )}

      {/* Page Title & Search Bar Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-purple-500/20 pb-6">
        <div>
          <div className="inline-flex items-center space-x-2 rtl:space-x-reverse bg-purple-950/80 theme-light:bg-purple-700 text-purple-200 theme-light:text-white px-3.5 py-1.5 rounded-full border border-purple-500/30 theme-light:border-purple-800 text-xs font-black shadow-sm mb-2">
            <Film className="w-4 h-4 text-pink-400 theme-light:text-yellow-300" />
            <span>{isAr ? 'معرض المشاريع الترجمية' : 'Fansub Subtitle Projects Gallery'}</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white theme-light:text-slate-950">
            {isAr ? 'جميع مشاريع الترجمة' : 'All Subtitle Projects'}
          </h2>
          <p className="text-xs text-slate-400 theme-light:text-slate-700 mt-1 font-semibold">
            {isAr ? 'إدارة وتحرير وحذف جميع مقاطع الفيديو والملفات الترجمية' : 'Manage, edit, export, and delete all saved fansub projects and media files.'}
          </p>
        </div>

        <div className="flex items-center space-x-3 rtl:space-x-reverse w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className={`w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-3' : 'left-3'}`} />
            <input
              type="text"
              dir={isAr ? 'rtl' : 'ltr'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث في المشاريع...' : 'Search projects...'}
              className={`w-full bg-slate-900 theme-light:bg-white border border-slate-700 theme-light:border-purple-300 focus:border-purple-500 rounded-2xl text-xs text-white theme-light:text-slate-900 outline-none transition ${isAr ? 'pr-9 pl-4' : 'pl-9 pr-4'} py-2.5`}
            />
          </div>

          <button
            onClick={onStartWizard}
            className="flex items-center space-x-2 rtl:space-x-reverse px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:opacity-90 text-white font-extrabold text-xs shadow-lg shadow-purple-500/20 shrink-0 transition"
          >
            <PlusCircle className="w-4 h-4 text-pink-200" />
            <span>{isAr ? 'مشروع جديد' : 'New Project'}</span>
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="text-center py-16 text-purple-300">
          <Sparkles className="w-8 h-8 animate-spin mx-auto mb-2 text-purple-400" />
          <p className="text-xs font-semibold">{isAr ? 'جاري تحميل المشاريع...' : 'Loading saved projects...'}</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center border border-slate-800 space-y-4 max-w-lg mx-auto">
          <Film className="w-12 h-12 text-slate-500 mx-auto" />
          <h3 className="text-lg font-bold text-white theme-light:text-slate-950">
            {isAr ? 'لا توجد مشاريع حتى الآن' : 'No Subtitle Projects Found'}
          </h3>
          <p className="text-xs text-slate-400 theme-light:text-slate-700">
            {searchQuery
              ? (isAr ? 'لم يتم العثور على نتائج تطابق البحث' : 'No projects match your search query.')
              : (isAr ? 'ابدأ بإنشاء أول مشروع ترجمة فيديو الآن!' : 'Get started by creating your first video fansub project!')}
          </p>
          <button
            onClick={onStartWizard}
            className="px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg"
          >
            {isAr ? 'إنشاء مشروع الآن' : 'Create Project Now'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((p) => {
            const lineCount = p.subtitles?.length || 0;
            const approvedCount = p.subtitles?.filter(s => s.approved)?.length || 0;

            return (
              <div
                key={p.id}
                className="glass-panel p-6 rounded-3xl border border-slate-800 theme-light:border-purple-600 hover:border-purple-500/60 transition shadow-xl flex flex-col justify-between space-y-5 group"
              >
                <div>
                  {/* Top Badge & Delete Icon */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-200 theme-light:text-white bg-purple-950 theme-light:bg-purple-700 px-3 py-1 rounded-full border border-purple-500/30 theme-light:border-purple-800 shadow-sm">
                      {p.projectType || 'Episode'}
                    </span>
                    <button
                      onClick={() => setDeletingProjectId(p.id)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
                      title={isAr ? 'حذف المشروع' : 'Delete Project'}
                    >
                      <Trash2 className="w-4 h-4 text-rose-400" />
                    </button>
                  </div>

                  {/* Project Titles */}
                  <h3 className="text-lg font-extrabold text-white theme-light:text-slate-950 group-hover:text-purple-400 theme-light:group-hover:text-purple-700 transition truncate">
                    {p.projectName}
                  </h3>
                  <p className="text-xs text-slate-400 theme-light:text-slate-600 font-medium truncate mt-1">
                    {p.mediaTitle}
                  </p>
                </div>

                {/* Subtitle Stats */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80 theme-light:border-purple-200 text-xs">
                  <div className="bg-slate-900/80 theme-light:bg-purple-50 p-3 rounded-2xl border border-slate-800 theme-light:border-purple-200 shadow-sm">
                    <span className="text-[10px] text-slate-400 theme-light:text-purple-900 font-extrabold block mb-0.5">{isAr ? 'أسطر الترجمة' : 'Total Lines'}</span>
                    <span className="font-extrabold text-white theme-light:text-slate-950 text-sm">{lineCount} {isAr ? 'سطر' : 'lines'}</span>
                  </div>
                  <div className="bg-slate-900/80 theme-light:bg-purple-50 p-3 rounded-2xl border border-slate-800 theme-light:border-purple-200 shadow-sm">
                    <span className="text-[10px] text-slate-400 theme-light:text-purple-900 font-extrabold block mb-0.5">{isAr ? 'المعتمدة' : 'Approved'}</span>
                    <span className="font-extrabold text-emerald-400 theme-light:text-emerald-700 text-sm">{approvedCount}/{lineCount}</span>
                  </div>
                </div>

                {/* Action Button: Vibrant Gradient Pill */}
                <button
                  onClick={() => onEditProject(p)}
                  className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:opacity-90 text-white font-extrabold text-xs rounded-2xl transition shadow-md shadow-purple-500/20 flex items-center justify-center space-x-2 rtl:space-x-reverse"
                >
                  <Edit3 className="w-4 h-4 text-pink-200" />
                  <span>{isAr ? 'فتح المحرر والترجمة' : 'Open Editor & Worktable'}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingProjectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-panel p-6 sm:p-8 rounded-3xl border border-rose-500/30 text-center space-y-5 shadow-2xl animate-fade-in">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white theme-light:text-slate-950">
                {isAr ? 'تأكيد حذف المشروع' : 'Confirm Project Deletion'}
              </h3>
              <p className="text-xs text-rose-300 theme-light:text-rose-700 mt-2 leading-relaxed font-semibold">
                {isAr
                  ? 'هل أنت تأكد من أنك تريد حذف هذا المشروع؟ سيتم حذف جميع الملفات نهائياً بما في ذلك الفيديو والصوت وملف الترجمة.'
                  : 'Are you sure you want to delete this project? All associated media files (video, audio track, and SRT subtitles) will be permanently deleted from the server.'}
              </p>
            </div>

            <div className="flex items-center space-x-3 rtl:space-x-reverse pt-2">
              <button
                disabled={isDeleting}
                onClick={() => setDeletingProjectId(null)}
                className="flex-1 py-3 bg-slate-900 theme-light:bg-slate-100 border border-slate-700 theme-light:border-slate-300 text-slate-300 theme-light:text-slate-800 rounded-xl text-xs font-semibold transition"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-500/30 transition flex items-center justify-center space-x-1.5"
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
