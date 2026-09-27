import React, { useState, useEffect } from 'react';
import { Search, Trash2, ArrowLeft, AlertTriangle, Edit3, Film, Sparkles, CheckCircle2, PlusCircle, Tv, Video, Layers, Filter, UserCheck, Shield } from 'lucide-react';

export default function ProjectsGallery({ onEditProject, onStartWizard, onOpenAssignAuditor, user, lang = 'en' }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');
  const [sortOption, setSortOption] = useState('newest');
  const [viewMode, setViewMode] = useState('folders');
  const [selectedFolder, setSelectedFolder] = useState(null); // 'all', 'episode', 'movie', 'trailer', 'clip'
  
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

  // Sort and filter projects
  const sortedProjects = [...projects].sort((a, b) => {
    const dateA = new Date(a.updatedAt || a.createdAt || a.id || 0).getTime();
    const dateB = new Date(b.updatedAt || b.createdAt || b.id || 0).getTime();
    if (sortOption === 'newest') return dateB - dateA;
    if (sortOption === 'oldest') return dateA - dateB;
    if (sortOption === 'nameAsc') return (a.projectName || '').localeCompare(b.projectName || '');
    if (sortOption === 'nameDesc') return (b.projectName || '').localeCompare(a.projectName || '');
    return 0;
  });

  const filteredProjects = sortedProjects.filter(p => {
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

      {/* SORTING & FILTER TABS BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="flex items-center space-x-2 rtl:space-x-reverse overflow-x-auto pb-2">
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

        {/* SORT DROPDOWN */}
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="bg-slate-900 theme-light:bg-white border border-slate-700 theme-light:border-purple-400 text-white theme-light:text-slate-950 text-xs font-bold rounded-xl px-3 py-2 outline-none"
        >
          <option value="newest">{isAr ? 'الأحدث أولاً' : 'Latest First'}</option>
          <option value="oldest">{isAr ? 'الأقدم أولاً' : 'Oldest First'}</option>
          <option value="nameAsc">{isAr ? 'الاسم (أ-ي)' : 'Name (A-Z)'}</option>
          <option value="nameDesc">{isAr ? 'الاسم (ي-أ)' : 'Name (Z-A)'}</option>
        </select>
      </div>

      {/* Projects Grid Layout */}
      {/* VIEW MODE TOGGLE */}
      <div className="flex justify-end mb-4" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="flex bg-slate-900 theme-light:bg-white rounded-xl p-1 border border-slate-700 theme-light:border-purple-300 shadow-md">
          <button onClick={() => { setViewMode('folders'); setSelectedFolder(null); }} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'folders' ? 'bg-purple-600 text-white' : 'text-slate-400 theme-light:text-slate-500'}`}>
            {isAr ? 'عرض المجلدات' : 'Folders'}
          </button>
          <button onClick={() => setViewMode('flat')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'flat' ? 'bg-purple-600 text-white' : 'text-slate-400 theme-light:text-slate-500'}`}>
            {isAr ? 'عرض القائمة' : 'List'}
          </button>
        </div>
      </div>

      {/* FOLDER NAVIGATION BACK BUTTON */}
      {viewMode === 'folders' && selectedFolder && (
        <div className="mb-4 flex items-center" dir={isAr ? 'rtl' : 'ltr'}>
           <button onClick={() => setSelectedFolder(null)} className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-slate-800 theme-light:bg-slate-200 text-white theme-light:text-slate-800 rounded-xl hover:bg-slate-700 transition font-bold text-xs shadow-md">
             <ArrowLeft className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
             <span>{isAr ? 'العودة للمجلدات' : 'Back to Folders'}</span>
           </button>
           <h3 className="text-xl font-black text-white theme-light:text-slate-900 mx-4">{selectedFolder}</h3>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-purple-300">
          <Sparkles className="w-10 h-10 animate-spin mx-auto mb-3 text-purple-400" />
          <p className="text-sm font-black text-white theme-light:text-slate-950">{isAr ? 'جاري تحميل قائمة مشاريعك...' : 'Loading project gallery...'}</p>
        </div>
      ) : (() => {
        
        // Handle Folder View Root
        if (viewMode === 'folders' && !selectedFolder) {
           const folderNames = [...new Set(filteredProjects.map(p => p.projectName || (isAr ? 'مشاريع غير مصنفة' : 'Uncategorized')))];
           
           if (folderNames.length === 0) return (
             <div className="glass-panel p-12 rounded-3xl text-center border border-purple-500/30 max-w-lg mx-auto shadow-2xl">
                <Layers className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white theme-light:text-slate-950 mb-2">{isAr ? 'لا توجد مجلدات' : 'No Folders Found'}</h3>
             </div>
           );

           return (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
               {folderNames.map(folder => {
                 const folderProjects = filteredProjects.filter(p => (p.projectName || (isAr ? 'مشاريع غير مصنفة' : 'Uncategorized')) === folder);
                 return (
                   <div key={folder} onClick={() => setSelectedFolder(folder)} className="glass-panel-glow p-6 rounded-3xl border border-purple-500/30 cursor-pointer hover:scale-105 transition shadow-xl group bg-slate-900/50 theme-light:bg-white">
                     <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-800 flex items-center justify-center mb-4 group-hover:-translate-y-1 transition shadow-lg">
                       <Layers className="w-7 h-7 text-white" />
                     </div>
                     <h3 className="text-lg font-black text-white theme-light:text-slate-950 mb-1 line-clamp-1">{folder}</h3>
                     <p className="text-xs text-purple-300 theme-light:text-purple-700 font-bold">{folderProjects.length} {isAr ? 'عنصر' : 'items'}</p>
                   </div>
                 );
               })}
             </div>
           );
        }

        // Handle Project List (Flat or Inside Folder)
        const displayProjects = viewMode === 'folders' 
          ? filteredProjects.filter(p => (p.projectName || (isAr ? 'مشاريع غير مصنفة' : 'Uncategorized')) === selectedFolder) 
          : filteredProjects;

        if (displayProjects.length === 0) return (
          <div className="glass-panel p-12 rounded-3xl text-center border border-purple-500/30 space-y-5 max-w-lg mx-auto shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-purple-950 theme-light:bg-purple-800 border-2 border-purple-400 flex items-center justify-center text-pink-300">
              <Film className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-white theme-light:text-slate-950">
              {isAr ? 'لا توجد مشاريع' : 'No Projects Found'}
            </h3>
          </div>
        );

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayProjects.map((p) => {
              const lineCount = p.subtitles?.length || 0;
              const approvedCount = p.subtitles?.filter(s => s.approved)?.length || 0;
              const progressPercent = lineCount > 0 ? Math.round((approvedCount / lineCount) * 100) : 0;
              
              return (
                <div key={p.id} className="group relative glass-panel-glow rounded-3xl overflow-hidden border border-purple-500/30 shadow-2xl hover:shadow-purple-500/40 transition-all hover:-translate-y-1 flex flex-col h-full bg-slate-900/60 theme-light:bg-white" dir={isAr ? 'rtl' : 'ltr'}>
                  {/* Status Banner */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500 opacity-80" />

                  <div className="p-5 flex-1 flex flex-col">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="inline-flex items-center space-x-2 rtl:space-x-reverse bg-purple-950 theme-light:bg-purple-100 px-3 py-1 rounded-full border border-purple-500/30 theme-light:border-purple-300 mb-2">
                          {getCategoryIcon(p.projectType)}
                          <span className="text-[10px] font-black text-purple-200 theme-light:text-purple-800 tracking-wider uppercase">
                            {getCategoryLabel(p.projectType)}
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-white theme-light:text-slate-950 leading-tight mb-1 line-clamp-2">
                          {p.mediaTitle}
                        </h3>
                        <p className="text-xs font-bold text-slate-400 theme-light:text-slate-600 line-clamp-1">
                          {p.projectName}
                        </p>
                      </div>

                      {/* Action Dropdown Menu Placeholder */}
                      <button 
                        onClick={() => setDeletingProjectId(p.id)}
                        className="p-2 rounded-xl bg-slate-900/50 theme-light:bg-rose-100 border border-slate-700 theme-light:border-rose-200 text-slate-400 theme-light:text-rose-600 hover:text-rose-400 hover:border-rose-500/50 transition group-hover:opacity-100 opacity-0"
                        title={isAr ? 'حذف المشروع' : 'Delete Project'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Meta Info */}
                    <div className="mt-auto space-y-4">
                      
                      {/* Date */}
                      <div className="flex items-center space-x-2 rtl:space-x-reverse text-xs text-slate-400 theme-light:text-slate-500 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          {new Date(p.createdAt || p.id).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
                            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>

                      {/* Audit Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-black">
                          <span className="text-purple-300 theme-light:text-purple-800">{isAr ? 'الترجمة والتدقيق' : 'Subtitling Progress'}</span>
                          <span className={progressPercent === 100 ? 'text-emerald-400' : 'text-pink-400'}>{progressPercent}%</span>
                        </div>
                        <div className="w-full bg-slate-800 theme-light:bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${progressPercent === 100 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-gradient-to-r from-pink-500 to-purple-500 shadow-[0_0_10px_rgba(217,70,239,0.5)]'}`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-2 flex items-center space-x-2 rtl:space-x-reverse">
                        <button
                          onClick={() => onEditProject(p)}
                          className="flex-1 flex items-center justify-center space-x-2 rtl:space-x-reverse bg-purple-950 theme-light:bg-purple-700 hover:bg-purple-900 theme-light:hover:bg-purple-800 text-white py-2.5 rounded-xl border border-purple-500/30 transition text-xs font-black shadow-md wizard-white-text"
                        >
                          <Edit3 className="w-4 h-4 text-purple-300 theme-light:text-purple-200" />
                          <span>{isAr ? 'فتح المحرر' : 'Open Editor'}</span>
                        </button>
                        
                        {(user?.role === 'Admin' || user?.role === 'Translator') && (
                          <button
                            onClick={() => onOpenAssignAuditor(p)}
                            className="p-2.5 rounded-xl bg-slate-800 theme-light:bg-slate-200 border border-slate-700 theme-light:border-slate-300 text-slate-300 theme-light:text-slate-700 hover:text-white theme-light:hover:bg-purple-100 transition shadow-sm"
                            title={isAr ? 'تعيين مدقق' : 'Assign Auditor'}
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

            {/* Delete Confirmation Modal */}
      {deletingProjectId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <div className="bg-slate-900 theme-light:bg-white p-6 rounded-3xl border border-rose-500/30 max-w-sm w-full shadow-2xl relative overflow-hidden">
            
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-pink-500" />
            
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-rose-500" />
              </div>
              
              <h3 className="text-xl font-black text-white theme-light:text-slate-950">
                {lang === 'ar' ? 'حذف المشروع' : 'Delete Project'}
              </h3>
              
              <p className="text-sm font-bold text-slate-400 theme-light:text-slate-600 leading-relaxed">
                {lang === 'ar' 
                  ? 'هل أنت متأكد من حذف هذا المشروع؟ سيتم حذف جميع الملفات النصية والصوتية المرتبطة به نهائياً ولن يمكنك التراجع.' 
                  : 'Are you sure you want to delete this project? All associated media and text files will be permanently erased. This cannot be undone.'}
              </p>
            </div>

            <div className="mt-8 flex space-x-3 rtl:space-x-reverse">
              <button
                onClick={() => setDeletingProjectId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 theme-light:border-slate-300 text-slate-300 theme-light:text-slate-700 font-black hover:bg-slate-800 theme-light:hover:bg-slate-100 transition"
                disabled={isDeleting}
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-black shadow-lg hover:shadow-rose-500/25 transition disabled:opacity-50"
              >
                {isDeleting ? (lang === 'ar' ? 'جاري الحذف...' : 'Deleting...') : (lang === 'ar' ? 'نعم، احذف نهائياً' : 'Yes, Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scroll to Top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-indigo-600 text-white shadow-xl hover:bg-indigo-500 transition hover:-translate-y-1"
        title="Scroll to Top"
      >
        <ArrowLeft className="w-6 h-6 rotate-90" />
      </button>
    </div>
  );
}
