import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Trash2, ArrowLeft, AlertTriangle, Edit3, Film, Sparkles, CheckCircle2,
  PlusCircle, Tv, Video, Layers, Filter, UserCheck, Shield, FolderInput, Folder,
  LayoutGrid, List, GripVertical, Clock, Calendar, ChevronRight, FolderPlus,
  Pencil, Check, X
} from 'lucide-react';

// ====================================================
// ARABIC GRAMMAR PLURALIZATION FOR ITEMS (عنصر / عناصر)
// ====================================================
export const formatArabicItemCount = (count) => {
  if (count === 0) return 'لا توجد عناصر';
  if (count === 1) return 'عنصر واحد';
  if (count === 2) return 'عنصران';
  
  const lastTwo = count % 100;
  
  if (count >= 3 && count <= 10) {
    return `${count} عناصر`;
  }
  
  if (count > 10 && lastTwo >= 3 && lastTwo <= 10) {
    return `${count} عناصر`;
  }
  
  if (lastTwo >= 11 && lastTwo <= 99) {
    return `${count} عنصراً`;
  }
  
  return `${count} عنصر`;
};

export const formatItemCount = (count, isAr = false) => {
  if (isAr) return formatArabicItemCount(count);
  if (count === 0) return 'No items';
  if (count === 1) return '1 item';
  return `${count} items`;
};

// ====================================================
// EPISODE BACKGROUND IMAGE RESOLVER
// Extracts title sign, first visual sign, titleFrame, or thumbnail
// ====================================================
export const getEpisodeBackground = (p) => {
  if (!p) return null;
  // 1. Title sign from visualSigns
  const titleSign = p.visualSigns?.find(s => s.category === 'title');
  if (titleSign?.thumbnailUrl) return titleSign.thumbnailUrl;
  if (titleSign?.imageUrl) return titleSign.imageUrl;
  if (titleSign?.cropUrl) return titleSign.cropUrl;

  // 2. First visual sign
  const firstSign = p.visualSigns?.[0];
  if (firstSign?.thumbnailUrl) return firstSign.thumbnailUrl;
  if (firstSign?.imageUrl) return firstSign.imageUrl;
  if (firstSign?.cropUrl) return firstSign.cropUrl;

  // 3. titleFrame or thumbnailUrl or coverImage
  if (p.titleFrame) return p.titleFrame;
  if (p.thumbnailUrl) return p.thumbnailUrl;
  if (p.coverImage) return p.coverImage;

  // 4. Character image if available
  if (p.characters?.[0]?.imageUrl) return p.characters[0].imageUrl;

  return null;
};

export default function ProjectsGallery({
  onEditProject,
  onStartWizard,
  onOpenAssignAuditor,
  user,
  lang = 'en',
  initialFolder = null,
  onFolderChange = null
}) {
  const isAr = lang === 'ar';
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');
  const [sortOption, setSortOption] = useState('newest');

  // View modes:
  // folderViewMode: 'cards' | 'list' (root view)
  // episodeViewMode: 'cards' | 'list' (inside folder)
  const [folderViewMode, setFolderViewMode] = useState('cards');
  const [episodeViewMode, setEpisodeViewMode] = useState('cards');

  // Folder navigation & isolation
  const [selectedFolderKey, setSelectedFolderKey] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(initialFolder || null);

  // Episodes inside active folder (with custom drag-and-drop order)
  const [orderedEpisodes, setOrderedEpisodes] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Title Editing State (Inline & Modal)
  const [editingTitleId, setEditingTitleId] = useState(null);
  const [editingModalProject, setEditingModalProject] = useState(null);
  const [newTitleValue, setNewTitleValue] = useState('');
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [titleError, setTitleError] = useState(null);

  // Permission Check: Owner of the file/project or Admin
  const canEditTitle = (project) => {
    if (!project) return false;
    if (user?.role === 'Admin') return true;
    const currentUserId = user?.id || 'usr_guest';
    const ownerId = project.ownerId || 'usr_guest';
    return ownerId === currentUserId;
  };

  const handleStartInlineEditTitle = (project) => {
    setEditingTitleId(project.id);
    setNewTitleValue(project.mediaTitle || '');
    setTitleError(null);
  };

  const handleCancelInlineEditTitle = () => {
    setEditingTitleId(null);
    setNewTitleValue('');
    setTitleError(null);
  };

  const handleOpenEditTitleModal = (project) => {
    setEditingModalProject(project);
    setNewTitleValue(project.mediaTitle || '');
    setTitleError(null);
  };

  const handleSaveTitle = async (projectId) => {
    const trimmed = newTitleValue.trim();
    if (!trimmed) {
      setTitleError(isAr ? 'لا يمكن ترك عنوان الفيديو فارغاً' : 'Episode title cannot be empty');
      return;
    }

    setIsSavingTitle(true);
    setTitleError(null);

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(user?.id ? { 'x-user-id': user.id } : {})
      };

      const res = await fetch(`/api/project/${projectId}/title`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ mediaTitle: trimmed })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update title');
      }

      // Optimistically update project title in local lists
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, mediaTitle: trimmed } : p));
      setOrderedEpisodes(prev => prev.map(p => p.id === projectId ? { ...p, mediaTitle: trimmed } : p));

      setToastMsg(isAr ? 'تم تعديل عنوان الفيديو بنجاح' : 'Episode title updated successfully');
      setTimeout(() => setToastMsg(null), 3500);

      setEditingTitleId(null);
      setEditingModalProject(null);
      setNewTitleValue('');
    } catch (err) {
      console.error('Update title error:', err);
      setTitleError(err.message || 'Error updating title');
    } finally {
      setIsSavingTitle(false);
    }
  };

  // Browser history sync
  useEffect(() => {
    if (initialFolder) {
      try {
        window.history.replaceState({ view: 'projects', subtieFolder: initialFolder }, '', window.location.pathname);
      } catch (e) {}
    }
  }, [initialFolder]);

  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state && event.state.view === 'projects') {
        const folder = event.state.subtieFolder || null;
        setSelectedFolder(folder);
        if (!folder) setSelectedFolderKey(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectFolder = (folderObj) => {
    setSelectedFolderKey(folderObj.key);
    setSelectedFolder(folderObj.name);
    if (onFolderChange) onFolderChange(folderObj.name);
    try {
      window.history.pushState({ view: 'projects', subtieFolder: folderObj.name, folderKey: folderObj.key }, '', window.location.pathname);
    } catch (e) {}
  };

  const handleBackToFolders = () => {
    setSelectedFolder(null);
    setSelectedFolderKey(null);
    if (onFolderChange) onFolderChange(null);
    if (window.history.state?.subtieFolder) {
      window.history.back();
    } else {
      try {
        window.history.pushState({ view: 'projects', subtieFolder: null }, '', window.location.pathname);
      } catch (e) {}
    }
  };

  // AI Folder Covers State
  const [folderCovers, setFolderCovers] = useState({});
  const [generatingCovers, setGeneratingCovers] = useState({});
  
  // Deletion modal states
  const [deletingProjectId, setDeletingProjectId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  // Move to Folder Modal state
  const [movingProject, setMovingProject] = useState(null);
  const [targetFolderName, setTargetFolderName] = useState('');
  const [moveFolderMode, setMoveFolderMode] = useState('existing');
  const [isMoving, setIsMoving] = useState(false);
  const [moveError, setMoveError] = useState(null);

  const handleOpenMoveModal = (project) => {
    setMovingProject(project);
    setMoveError(null);
    setIsMoving(false);
    
    // Only suggest folders owned by this user
    const currentUserId = user?.id || 'usr_guest';
    const userProjects = projects.filter(p => (p.ownerId || 'usr_guest') === currentUserId);
    const allFolders = [...new Set(userProjects.map(p => p.projectName).filter(Boolean))];
    const otherFolders = allFolders.filter(f => f !== project.projectName);
    
    if (otherFolders.length > 0) {
      setMoveFolderMode('existing');
      setTargetFolderName(otherFolders[0]);
    } else {
      setMoveFolderMode('new');
      setTargetFolderName('');
    }
  };

  const handleConfirmMove = async () => {
    if (!movingProject) return;
    const dest = targetFolderName.trim();
    if (!dest) {
      setMoveError(isAr ? 'يرجى تحديد أو إدخال اسم المجلد الهدف' : 'Please specify a target folder name');
      return;
    }
    if (dest === movingProject.projectName) {
      setMoveError(isAr ? 'الفيديو موجود بالفعل داخل هذا المجلد' : 'Video is already in this folder');
      return;
    }

    setIsMoving(true);
    setMoveError(null);

    try {
      const res = await fetch(`/api/project/${movingProject.id}/move-folder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.id ? { 'x-user-id': user.id } : {})
        },
        body: JSON.stringify({ newFolderName: dest })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to move project');
      }

      setProjects(prev => prev.map(p => p.id === movingProject.id ? { ...p, ...data.project } : p));
      
      setToastMsg(isAr ? `تم نقل الفيديو بنجاح إلى مجلد "${dest}"` : `Successfully moved video to "${dest}"`);
      setTimeout(() => setToastMsg(null), 4000);

      setMovingProject(null);
      fetchFolderCovers();
    } catch (err) {
      setMoveError(err.message || 'Error moving project');
    } finally {
      setIsMoving(false);
    }
  };

  const fetchFolderCovers = async () => {
    try {
      const res = await fetch('/api/folders/covers');
      const data = await res.json();
      if (data?.success && data?.covers) {
        setFolderCovers(data.covers);
      }
    } catch (e) {
      console.warn('Failed to load folder covers:', e);
    }
  };

  const handleGenerateCover = async (e, folderName) => {
    if (e?.stopPropagation) e.stopPropagation();
    setGeneratingCovers(prev => ({ ...prev, [folderName]: true }));
    try {
      const res = await fetch('/api/folders/generate-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderName, force: true })
      });
      const data = await res.json();
      if (data?.success && data?.coverUrl) {
        setFolderCovers(prev => ({ ...prev, [folderName]: data.coverUrl }));
      }
    } catch (err) {
      console.error('Generate cover error:', err);
    } finally {
      setGeneratingCovers(prev => ({ ...prev, [folderName]: false }));
    }
  };

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
    fetchFolderCovers();
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

  // Category translation and icon helpers
  const getCategoryLabel = (type) => {
    const t = String(type || 'Episode').toLowerCase();
    if (t.includes('movie') || t.includes('فيلم')) return isAr ? 'فيلم سينمائي' : 'Feature Movie';
    if (t.includes('trailer') || t.includes('تريلر') || t.includes('عرض')) return isAr ? 'تريلر ترويجي' : 'Teaser / Trailer';
    if (t.includes('clip') || t.includes('مقطع')) return isAr ? 'مقطع فيديو' : 'Short Video Clip';
    return isAr ? 'حلقة أنمي' : 'Anime Episode';
  };

  const getCategoryIcon = (type) => {
    const t = String(type || 'Episode').toLowerCase();
    if (t.includes('movie') || t.includes('فيلم')) return <Video className="w-4 h-4 text-pink-300" />;
    if (t.includes('trailer') || t.includes('تريلر') || t.includes('عرض')) return <Sparkles className="w-4 h-4 text-amber-300" />;
    if (t.includes('clip') || t.includes('مقطع')) return <Layers className="w-4 h-4 text-indigo-300" />;
    return <Tv className="w-4 h-4 text-purple-300" />;
  };

  // Sort and filter projects
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || a.id || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || b.id || 0).getTime();
      if (sortOption === 'newest') return dateB - dateA;
      if (sortOption === 'oldest') return dateA - dateB;
      if (sortOption === 'nameAsc') return (a.projectName || '').localeCompare(b.projectName || '');
      if (sortOption === 'nameDesc') return (b.projectName || '').localeCompare(a.projectName || '');
      return 0;
    });
  }, [projects, sortOption]);

  const filteredProjects = useMemo(() => {
    return sortedProjects.filter(p => {
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
  }, [sortedProjects, searchQuery, activeCategoryFilter]);

  // ====================================================
  // FOLDERS GROUPING & USER ISOLATION (Requirement 4)
  // Isolates folders even if different users use the same folder name
  // ====================================================
  const foldersList = useMemo(() => {
    const map = new Map();
    filteredProjects.forEach(p => {
      const rawName = p.projectName || (isAr ? 'مشاريع غير مصنفة' : 'Uncategorized');
      const ownerId = p.ownerId || 'usr_guest';
      // For Admin, separate folders per owner to prevent collision
      const key = user?.role === 'Admin' ? `${ownerId}:::${rawName}` : rawName;
      
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: rawName,
          ownerId,
          ownerName: p.ownerName || '',
          ownerEmail: p.ownerEmail || '',
          projects: [],
          latestDate: new Date(p.updatedAt || p.createdAt || p.id || 0).getTime()
        });
      }
      const entry = map.get(key);
      entry.projects.push(p);
      const pDate = new Date(p.updatedAt || p.createdAt || p.id || 0).getTime();
      if (pDate > entry.latestDate) {
        entry.latestDate = pDate;
      }
    });

    return Array.from(map.values());
  }, [filteredProjects, isAr, user?.role]);

  // Active folder resolver
  const activeFolder = useMemo(() => {
    if (!selectedFolder) return null;
    if (selectedFolderKey) {
      const found = foldersList.find(f => f.key === selectedFolderKey);
      if (found) return found;
    }
    return foldersList.find(f => f.name === selectedFolder) || {
      key: selectedFolder,
      name: selectedFolder,
      ownerId: user?.id,
      projects: filteredProjects.filter(p => (p.projectName || (isAr ? 'مشاريع غير مصنفة' : 'Uncategorized')) === selectedFolder)
    };
  }, [selectedFolder, selectedFolderKey, foldersList, filteredProjects, isAr, user?.id]);

  // Keep episodes sorted and synchronized
  useEffect(() => {
    if (!activeFolder) {
      setOrderedEpisodes([]);
      return;
    }
    const sorted = [...activeFolder.projects].sort((a, b) => {
      if (typeof a.order === 'number' && typeof b.order === 'number') {
        return a.order - b.order;
      }
      if (typeof a.order === 'number') return -1;
      if (typeof b.order === 'number') return 1;

      if (sortOption === 'newest') return new Date(b.createdAt || b.id) - new Date(a.createdAt || a.id);
      if (sortOption === 'oldest') return new Date(a.createdAt || a.id) - new Date(b.createdAt || b.id);
      if (sortOption === 'nameAsc') return (a.mediaTitle || '').localeCompare(b.mediaTitle || '');
      if (sortOption === 'nameDesc') return (b.mediaTitle || '').localeCompare(a.mediaTitle || '');
      return 0;
    });
    setOrderedEpisodes(sorted);
  }, [activeFolder, sortOption]);

  // ====================================================
  // HTML5 DRAG-AND-DROP REORDER HANDLERS (Requirement 1)
  // ====================================================
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', index.toString());
    } catch (err) {}
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e, index) => {
    if (dragOverIndex === index) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = async (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...orderedEpisodes];
    const [movedItem] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, movedItem);

    const reindexed = updated.map((item, idx) => ({ ...item, order: idx }));
    setOrderedEpisodes(reindexed);
    setDraggedIndex(null);
    setDragOverIndex(null);

    // Save reorder to server
    try {
      setIsSavingOrder(true);
      const headers = { 'Content-Type': 'application/json' };
      if (user?.id) headers['x-user-id'] = user.id;

      await fetch('/api/folders/reorder', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          folderName: selectedFolder,
          projectIds: reindexed.map(p => p.id)
        })
      });
    } catch (err) {
      console.error('Failed to save episode order:', err);
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

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
              onClick={() => onStartWizard(selectedFolder || '')}
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

      {/* ==================================================== */}
      {/* ROOT LEVEL: FOLDERS VIEW CONTROLS (Requirement 6)    */}
      {/* ==================================================== */}
      {!selectedFolder && (
        <div className="flex items-center justify-between mb-4" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="flex items-center space-x-2 rtl:space-x-reverse text-xs text-slate-400 font-bold">
            <Folder className="w-4 h-4 text-purple-400" />
            <span>
              {isAr ? `إجمالي المجلدات: ${foldersList.length}` : `Total Folders: ${foldersList.length}`}
            </span>
          </div>

          <div className="flex items-center bg-slate-900 theme-light:bg-white rounded-xl p-1 border border-slate-700 theme-light:border-purple-300 shadow-md">
            <button
              type="button"
              onClick={() => setFolderViewMode('cards')}
              className={`flex items-center space-x-1.5 rtl:space-x-reverse px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                folderViewMode === 'cards'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 theme-light:text-slate-600 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{isAr ? 'عرض المجلدات كبطاقات' : 'Folder Card View'}</span>
            </button>
            <button
              type="button"
              onClick={() => setFolderViewMode('list')}
              className={`flex items-center space-x-1.5 rtl:space-x-reverse px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                folderViewMode === 'list'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 theme-light:text-slate-600 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>{isAr ? 'عرض المجلدات كقائمة' : 'Folder List View'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* INSIDE FOLDER: HEADER & ACTION CONTROLS (Req 2 & 6)  */}
      {/* ==================================================== */}
      {selectedFolder && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-3xl border border-purple-500/30 backdrop-blur-md shadow-xl" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="flex items-center space-x-3 rtl:space-x-reverse flex-wrap gap-2">
            <button
              onClick={handleBackToFolders}
              className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-slate-800 theme-light:bg-slate-200 text-white theme-light:text-slate-800 rounded-xl hover:bg-slate-700 transition font-bold text-xs shadow-md border border-slate-700/60"
            >
              <ArrowLeft className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
              <span>{isAr ? 'العودة للمجلدات' : 'Back to Folders'}</span>
            </button>

            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Folder className="w-5 h-5 text-pink-400" />
              <h3 className="text-xl font-black text-white theme-light:text-slate-900">{selectedFolder}</h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-950/80 border border-purple-400/40 text-purple-200 font-extrabold">
                {formatItemCount(orderedEpisodes.length, isAr)}
              </span>
            </div>

            {user?.role === 'Admin' && activeFolder?.ownerName && (
              <div className="inline-flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1 rounded-xl bg-amber-950/80 border border-amber-500/40 text-xs font-bold text-amber-300 shadow-md">
                <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{isAr ? `المالك: ${activeFolder.ownerName}` : `Owner: ${activeFolder.ownerName}`}</span>
              </div>
            )}

            {isSavingOrder && (
              <span className="inline-flex items-center space-x-1.5 rtl:space-x-reverse text-xs text-pink-300 animate-pulse font-bold bg-pink-950/50 px-2.5 py-1 rounded-lg border border-pink-500/30">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>{isAr ? 'جاري حفظ الترتيب...' : 'Saving order...'}</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            {/* Requirement 2: Add Episode Button directly inside folder view */}
            {(!user || user.role !== 'Auditor') && (
              <button
                type="button"
                onClick={() => onStartWizard(selectedFolder)}
                className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:scale-105 text-white font-black text-xs shadow-lg shadow-purple-500/25 transition wizard-white-text border border-purple-400/40 shrink-0"
                title={isAr ? 'إضافة حلقة جديدة لهذا المجلد' : 'Add another episode to this folder'}
              >
                <PlusCircle className="w-4 h-4 text-pink-200" />
                <span>{isAr ? '+ حلقة جديدة' : '+ Add Episode'}</span>
              </button>
            )}

            {/* Requirement 6: Episode View Mode Toggle inside folder */}
            <div className="flex items-center bg-slate-900 theme-light:bg-white rounded-xl p-1 border border-slate-700 theme-light:border-purple-300 shadow-md">
              <button
                type="button"
                onClick={() => setEpisodeViewMode('cards')}
                className={`flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  episodeViewMode === 'cards'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 theme-light:text-slate-600 hover:text-white'
                }`}
                title={isAr ? 'عرض الحلقات كبطاقات' : 'Episode Card View'}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>{isAr ? 'عرض كبطاقات' : 'Card View'}</span>
              </button>
              <button
                type="button"
                onClick={() => setEpisodeViewMode('list')}
                className={`flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  episodeViewMode === 'list'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 theme-light:text-slate-600 hover:text-white'
                }`}
                title={isAr ? 'عرض الحلقات كقائمة' : 'Episode List View'}
              >
                <List className="w-3.5 h-3.5" />
                <span>{isAr ? 'عرض كقائمة' : 'List View'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-purple-300">
          <Sparkles className="w-10 h-10 animate-spin mx-auto mb-3 text-purple-400" />
          <p className="text-sm font-black text-white theme-light:text-slate-950">{isAr ? 'جاري تحميل قائمة مشاريعك...' : 'Loading project gallery...'}</p>
        </div>
      ) : (() => {
        // ====================================================
        // SCENARIO 1: ROOT FOLDER VIEW (Cards or List)
        // ====================================================
        if (!selectedFolder) {
          if (foldersList.length === 0) {
            return (
              <div className="glass-panel p-12 rounded-3xl text-center border border-purple-500/30 max-w-lg mx-auto shadow-2xl">
                <Layers className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white theme-light:text-slate-950 mb-2">{isAr ? 'لا توجد مجلدات' : 'No Folders Found'}</h3>
              </div>
            );
          }

          // 1A. ROOT: FOLDER CARD VIEW
          if (folderViewMode === 'cards') {
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {foldersList.map(folder => {
                  const coverUrl = folderCovers[folder.name];
                  const isGenerating = generatingCovers[folder.name];

                  return (
                    <div
                      key={folder.key}
                      onClick={() => handleSelectFolder(folder)}
                      className="group relative rounded-3xl overflow-hidden border border-purple-500/30 hover:border-pink-500/80 cursor-pointer hover:scale-[1.03] transition-all duration-300 shadow-xl h-60 flex flex-col justify-between p-5 bg-slate-950"
                      style={
                        coverUrl
                          ? {
                              backgroundImage: `url(${coverUrl})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }
                          : {
                              background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
                            }
                      }
                    >
                      {/* Dark Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-purple-950/30 group-hover:via-slate-950/45 transition-all duration-300 pointer-events-none" />

                      {/* Top Bar: Folder Icon Badge & AI Regenerate Action */}
                      <div className="relative z-10 flex items-center justify-between" dir={isAr ? 'rtl' : 'ltr'}>
                        <div className="w-12 h-12 rounded-2xl bg-purple-950/85 backdrop-blur-md border border-purple-400/40 flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                          <Layers className="w-6 h-6 text-pink-300" />
                        </div>

                        <button
                          type="button"
                          title={isAr ? 'إعادة توليد غلاف أنمي بالذكاء الاصطناعي' : 'Regenerate AI Anime Background Art'}
                          onClick={(e) => handleGenerateCover(e, folder.name)}
                          disabled={isGenerating}
                          className="flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 py-1.5 rounded-xl bg-slate-950/75 hover:bg-purple-900/90 text-purple-200 hover:text-white border border-purple-400/40 backdrop-blur-md text-[11px] font-black transition shadow-md"
                        >
                          <Sparkles className={`w-3.5 h-3.5 text-yellow-300 ${isGenerating ? 'animate-spin' : ''}`} />
                          <span>
                            {isGenerating ? (isAr ? 'جاري التوليد...' : 'Generating...') : (isAr ? 'توليد غلاف' : 'AI Cover')}
                          </span>
                        </button>
                      </div>

                      {/* Bottom: Title, Owner (Admin only) & Item Counter with Arabic Grammar (Req 5) */}
                      <div className="relative z-10 space-y-2 text-right" dir={isAr ? 'rtl' : 'ltr'}>
                        {user?.role === 'Admin' && folder.ownerName && (
                          <div className="inline-flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 py-1 rounded-xl bg-amber-950/85 border border-amber-500/40 text-[11px] font-bold text-amber-300 backdrop-blur-md shadow-md max-w-full" title={folder.ownerName}>
                            <UserCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="truncate">{isAr ? `المالك: ${folder.ownerName}` : `Owner: ${folder.ownerName}`}</span>
                          </div>
                        )}
                        <h3 className="text-lg font-black text-white drop-shadow-lg line-clamp-1 group-hover:text-pink-300 transition">
                          {folder.name}
                        </h3>
                        <div className="flex items-center justify-between">
                          {/* Proper Arabic Grammar format (Req 5) */}
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-950/85 backdrop-blur-md border border-purple-400/30 text-xs font-black text-purple-200 shadow-sm">
                            {formatItemCount(folder.projects.length, isAr)}
                          </span>
                          <span className="text-[11px] font-extrabold text-pink-300 opacity-0 group-hover:opacity-100 transition duration-200">
                            {isAr ? 'فتح المجلد ←' : 'Open Folder →'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          }

          // 1B. ROOT: FOLDER LIST VIEW (Requirement 6)
          return (
            <div className="glass-panel rounded-3xl border border-purple-500/30 overflow-hidden shadow-2xl" dir={isAr ? 'rtl' : 'ltr'}>
              <div className="overflow-x-auto">
                <table className="w-full text-right" dir={isAr ? 'rtl' : 'ltr'}>
                  <thead>
                    <tr className="bg-purple-950/60 border-b border-purple-500/20 text-xs font-black text-purple-200 uppercase tracking-wider">
                      <th className="py-4 px-6">{isAr ? 'المجلد والغلاف' : 'Folder & Cover'}</th>
                      {user?.role === 'Admin' && <th className="py-4 px-6">{isAr ? 'المالك' : 'Owner'}</th>}
                      <th className="py-4 px-6">{isAr ? 'عدد العناصر' : 'Items'}</th>
                      <th className="py-4 px-6">{isAr ? 'آخر نشاط' : 'Last Activity'}</th>
                      <th className="py-4 px-6 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-500/10 text-xs font-bold text-white">
                    {foldersList.map(folder => {
                      const coverUrl = folderCovers[folder.name];
                      const isGenerating = generatingCovers[folder.name];

                      return (
                        <tr
                          key={folder.key}
                          onClick={() => handleSelectFolder(folder)}
                          className="hover:bg-purple-950/30 cursor-pointer transition duration-150 group"
                        >
                          {/* Folder Name & AI Cover Thumbnail */}
                          <td className="py-4 px-6 flex items-center space-x-3 rtl:space-x-reverse">
                            <div className="w-12 h-12 rounded-xl bg-purple-950/80 border border-purple-400/40 overflow-hidden shrink-0 flex items-center justify-center relative shadow-md">
                              {coverUrl ? (
                                <img src={coverUrl} alt={folder.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-300" />
                              ) : (
                                <Folder className="w-6 h-6 text-pink-300" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-black text-white group-hover:text-pink-300 transition truncate">
                                {folder.name}
                              </h4>
                              <span className="text-[11px] text-slate-400 font-normal">
                                {folder.projects[0]?.projectType || 'Anime Series'}
                              </span>
                            </div>
                          </td>

                          {/* Owner badge (Admin only) */}
                          {user?.role === 'Admin' && (
                            <td className="py-4 px-6">
                              {folder.ownerName ? (
                                <span className="inline-flex items-center space-x-1 rtl:space-x-reverse px-2.5 py-0.5 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-300 text-[11px]">
                                  <UserCheck className="w-3 h-3 text-amber-400" />
                                  <span>{folder.ownerName}</span>
                                </span>
                              ) : (
                                <span className="text-slate-500">-</span>
                              )}
                            </td>
                          )}

                          {/* Items count with Arabic grammar (Req 5) */}
                          <td className="py-4 px-6">
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-950/70 border border-purple-400/30 text-purple-200 text-xs font-black">
                              {formatItemCount(folder.projects.length, isAr)}
                            </span>
                          </td>

                          {/* Last Activity */}
                          <td className="py-4 px-6 text-slate-400">
                            {new Date(folder.latestDate).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
                              year: 'numeric', month: 'short', day: 'numeric'
                            })}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
                              <button
                                type="button"
                                onClick={() => handleSelectFolder(folder)}
                                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition flex items-center space-x-1 rtl:space-x-reverse"
                              >
                                <span>{isAr ? 'فتح المجلد' : 'Open'}</span>
                                <ChevronRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleGenerateCover(e, folder.name)}
                                disabled={isGenerating}
                                className="p-2 rounded-xl bg-slate-900 border border-purple-500/30 hover:bg-purple-900 text-purple-200 transition"
                                title={isAr ? 'توليد غلاف بالذكاء الاصطناعي' : 'Generate AI Cover'}
                              >
                                <Sparkles className={`w-3.5 h-3.5 text-yellow-300 ${isGenerating ? 'animate-spin' : ''}`} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

        // ====================================================
        // SCENARIO 2: INSIDE FOLDER VIEW (Cards or List)
        // ====================================================
        if (orderedEpisodes.length === 0) {
          return (
            <div className="glass-panel p-12 rounded-3xl text-center border border-purple-500/30 space-y-5 max-w-lg mx-auto shadow-2xl">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-purple-950 theme-light:bg-purple-800 border-2 border-purple-400 flex items-center justify-center text-pink-300">
                <Film className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white theme-light:text-slate-950">
                {isAr ? 'لا توجد حلقات داخل هذا المجلد' : 'No Episodes in this Folder'}
              </h3>
              {(!user || user.role !== 'Auditor') && (
                <button
                  type="button"
                  onClick={() => onStartWizard(selectedFolder)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs shadow-lg hover:scale-105 transition"
                >
                  {isAr ? '+ إضافة أول حلقة' : '+ Add First Episode'}
                </button>
              )}
            </div>
          );
        }

        // 2A. INSIDE FOLDER: DRAGGABLE EPISODE CARD VIEW (Req 1)
        if (episodeViewMode === 'cards') {
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {orderedEpisodes.map((p, index) => {
                const lineCount = p.subtitles?.length || 0;
                const approvedCount = p.subtitles?.filter(s => s.approved)?.length || 0;
                const progressPercent = lineCount > 0 ? Math.round((approvedCount / lineCount) * 100) : 0;
                const bgImage = getEpisodeBackground(p);

                return (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={(e) => handleDragLeave(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`group relative glass-panel-glow rounded-3xl overflow-hidden border border-purple-500/30 hover:border-pink-500/70 shadow-2xl hover:shadow-purple-500/40 transition-all duration-300 hover:-translate-y-1 flex flex-col h-full cursor-pointer ${
                      draggedIndex === index ? 'opacity-40 scale-[0.98]' : ''
                    } ${
                      dragOverIndex === index ? 'ring-2 ring-pink-500 border-pink-500' : ''
                    }`}
                    style={
                      bgImage
                        ? {
                            backgroundImage: `linear-gradient(to top, rgba(10, 15, 30, 0.95) 0%, rgba(15, 23, 42, 0.82) 45%, rgba(30, 27, 75, 0.65) 100%), url(${bgImage})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }
                        : {
                            background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
                          }
                    }
                    dir={isAr ? 'rtl' : 'ltr'}
                  >
                    {/* Top status gradient bar */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500 opacity-80" />

                    <div className="p-5 flex-1 flex flex-col relative z-10">
                      {/* Header with Drag Handle & Actions */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0 pr-2 rtl:pr-0 rtl:pl-2">
                          <div className="flex flex-wrap items-center gap-1.5 mb-2">
                            {/* Drag handle */}
                            <div
                              className="cursor-grab active:cursor-grabbing p-1 rounded-lg bg-slate-900/80 hover:bg-purple-900 text-slate-400 hover:text-white transition shadow-sm border border-slate-700/60"
                              title={isAr ? 'اسحب لإعادة الترتيب' : 'Drag to reorder'}
                            >
                              <GripVertical className="w-3.5 h-3.5 text-pink-300" />
                            </div>

                            <div className="inline-flex items-center space-x-1.5 rtl:space-x-reverse bg-purple-950/80 theme-light:bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                              {getCategoryIcon(p.projectType)}
                              <span className="text-[10px] font-black text-purple-200 theme-light:text-purple-800 tracking-wider uppercase">
                                {getCategoryLabel(p.projectType)}
                              </span>
                            </div>

                            {bgImage && (
                              <span className="text-[9px] bg-purple-950/80 border border-purple-400/40 text-purple-200 px-2 py-0.5 rounded-full flex items-center space-x-1 rtl:space-x-reverse">
                                <Sparkles className="w-2.5 h-2.5 text-yellow-300" />
                                <span>{isAr ? 'لوحة العنوان' : 'Title Frame'}</span>
                              </span>
                            )}

                            {user?.role === 'Admin' && p.ownerName && (
                              <div className="inline-flex items-center space-x-1 rtl:space-x-reverse bg-amber-950/70 border border-amber-500/40 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-amber-300">
                                <UserCheck className="w-3 h-3 text-amber-400" />
                                <span>{isAr ? `المالك: ${p.ownerName}` : `Owner: ${p.ownerName}`}</span>
                              </div>
                            )}
                          </div>

                          {(p.status === 'downloading_torrent' || p.status === 'processing') && (
                            <div className="inline-flex items-center space-x-1.5 rtl:space-x-reverse bg-pink-950/80 theme-light:bg-pink-100 text-pink-300 theme-light:text-pink-900 px-2.5 py-0.5 rounded-full border border-pink-400/40 text-[10px] font-black mb-2 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                              <span>{p.status === 'downloading_torrent' ? (isAr ? 'تحميل التورنت...' : 'Torrent Ingest...') : (isAr ? 'معالجة ذكية...' : 'AI Processing...')} ({p.processingProgress || 10}%)</span>
                            </div>
                          )}

                          {/* Editable Media Title (Owner / Admin) */}
                          {editingTitleId === p.id ? (
                            <div className="mb-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                                <input
                                  type="text"
                                  dir="auto"
                                  value={newTitleValue}
                                  onChange={(e) => setNewTitleValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveTitle(p.id);
                                    if (e.key === 'Escape') handleCancelInlineEditTitle();
                                  }}
                                  autoFocus
                                  disabled={isSavingTitle}
                                  className="flex-1 bg-slate-950 border border-purple-500 rounded-xl px-2.5 py-1.5 text-xs text-white font-black outline-none focus:ring-2 focus:ring-pink-500 shadow-inner"
                                  placeholder={isAr ? 'عنوان الحلقة الجديد...' : 'New episode title...'}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveTitle(p.id)}
                                  disabled={isSavingTitle || !newTitleValue.trim()}
                                  className="p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-sm disabled:opacity-50"
                                  title={isAr ? 'حفظ التعديل (Enter)' : 'Save (Enter)'}
                                >
                                  {isSavingTitle ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelInlineEditTitle}
                                  disabled={isSavingTitle}
                                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                                  title={isAr ? 'إلغاء (Esc)' : 'Cancel (Esc)'}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              {titleError && <p className="text-[10px] text-rose-400 font-bold">{titleError}</p>}
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-1 mb-1 group/title">
                              <h3 className="text-lg font-black text-white theme-light:text-slate-950 leading-tight line-clamp-2 drop-shadow-md flex-1">
                                {p.mediaTitle}
                              </h3>
                              {canEditTitle(p) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartInlineEditTitle(p);
                                  }}
                                  className="p-1 rounded-lg text-slate-400 hover:text-pink-300 hover:bg-purple-900/60 transition opacity-80 group-hover:opacity-100 shrink-0"
                                  title={isAr ? 'تعديل عنوان الحلقة' : 'Edit episode title'}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}

                          <p className="text-xs font-bold text-slate-300 theme-light:text-slate-600 line-clamp-1">
                            {p.projectName}
                          </p>
                        </div>

                        {/* Action buttons (Edit Title, Move & Delete) */}
                        <div className="flex items-center space-x-1.5 rtl:space-x-reverse group-hover:opacity-100 opacity-90 sm:opacity-0 transition" onClick={(e) => e.stopPropagation()}>
                          {/* Edit Title Button (Owner or Admin) */}
                          {canEditTitle(p) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditTitleModal(p);
                              }}
                              className="p-2 rounded-xl bg-slate-900/80 theme-light:bg-purple-100 border border-slate-700 theme-light:border-purple-300 text-purple-300 theme-light:text-purple-700 hover:text-white hover:bg-purple-600 hover:border-purple-500 transition shadow-sm"
                              title={isAr ? 'تعديل عنوان هذا الفيديو' : 'Edit episode title'}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}

                          {(!user || user.role === 'Admin' || p.ownerId === user?.id) && (
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenMoveModal(p);
                              }}
                              className="p-2 rounded-xl bg-slate-900/80 theme-light:bg-purple-100 border border-slate-700 theme-light:border-purple-300 text-purple-300 theme-light:text-purple-700 hover:text-white hover:bg-purple-600 hover:border-purple-500 transition shadow-sm"
                              title={isAr ? 'نقل هذا الفيديو ومحتواه إلى مجلد آخر' : 'Move video and all contents to another folder'}
                            >
                              <FolderInput className="w-4 h-4" />
                            </button>
                          )}

                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingProjectId(p.id);
                            }}
                            className="p-2 rounded-xl bg-slate-900/80 theme-light:bg-rose-100 border border-slate-700 theme-light:border-rose-200 text-slate-400 theme-light:text-rose-600 hover:text-rose-400 hover:border-rose-500/50 transition shadow-sm"
                            title={isAr ? 'حذف المشروع' : 'Delete Project'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Meta Info & Progress */}
                      <div className="mt-auto space-y-4 pt-4">
                        <div className="flex items-center space-x-2 rtl:space-x-reverse text-xs text-slate-300 theme-light:text-slate-500 font-bold">
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
                          <div className="w-full bg-slate-800/80 theme-light:bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${progressPercent === 100 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-gradient-to-r from-pink-500 to-purple-500 shadow-[0_0_10px_rgba(217,70,239,0.5)]'}`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-2 flex items-center space-x-2 rtl:space-x-reverse" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onEditProject(p)}
                            className="flex-1 flex items-center justify-center space-x-2 rtl:space-x-reverse bg-purple-950/90 theme-light:bg-purple-700 hover:bg-purple-900 theme-light:hover:bg-purple-800 text-white py-2.5 rounded-xl border border-purple-500/40 transition text-xs font-black shadow-md wizard-white-text"
                          >
                            <Edit3 className="w-4 h-4 text-purple-300 theme-light:text-purple-200" />
                            <span>{isAr ? 'فتح المحرر' : 'Open Editor'}</span>
                          </button>
                          
                          {(user?.role === 'Admin' || user?.role === 'Translator') && (
                            <button
                              onClick={() => onOpenAssignAuditor(p)}
                              className="p-2.5 rounded-xl bg-slate-800/90 theme-light:bg-slate-200 border border-slate-700 theme-light:border-slate-300 text-slate-300 theme-light:text-slate-700 hover:text-white theme-light:hover:bg-purple-100 transition shadow-sm"
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
        }

        // 2B. INSIDE FOLDER: DRAGGABLE EPISODE LIST VIEW (Req 3 & 6)
        return (
          <div className="glass-panel rounded-3xl border border-purple-500/30 overflow-hidden shadow-2xl" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="overflow-x-auto">
              <table className="w-full text-right" dir={isAr ? 'rtl' : 'ltr'}>
                <thead>
                  <tr className="bg-purple-950/60 border-b border-purple-500/20 text-xs font-black text-purple-200 uppercase tracking-wider">
                    <th className="py-4 px-4 w-12 text-center">{isAr ? 'ترتيب' : 'Order'}</th>
                    <th className="py-4 px-6">{isAr ? 'الحلقة والمعاينة' : 'Episode & Preview'}</th>
                    {user?.role === 'Admin' && <th className="py-4 px-6">{isAr ? 'المالك' : 'Owner'}</th>}
                    <th className="py-4 px-6">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="py-4 px-6">{isAr ? 'نسبة الإنجاز' : 'Progress'}</th>
                    <th className="py-4 px-6">{isAr ? 'التاريخ' : 'Date'}</th>
                    <th className="py-4 px-6 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-500/10 text-xs font-bold text-white">
                  {orderedEpisodes.map((p, index) => {
                    const lineCount = p.subtitles?.length || 0;
                    const approvedCount = p.subtitles?.filter(s => s.approved)?.length || 0;
                    const progressPercent = lineCount > 0 ? Math.round((approvedCount / lineCount) * 100) : 0;
                    const bgImage = getEpisodeBackground(p);

                    return (
                      <tr
                        key={p.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={(e) => handleDragLeave(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`hover:bg-purple-950/30 transition duration-150 group ${
                          draggedIndex === index ? 'opacity-30 bg-purple-950/50' : ''
                        } ${
                          dragOverIndex === index ? 'bg-purple-900/40 border-t-2 border-b-2 border-pink-500' : ''
                        }`}
                      >
                        {/* Drag Handle */}
                        <td className="py-4 px-4 text-center cursor-grab active:cursor-grabbing text-slate-400 group-hover:text-pink-300">
                          <GripVertical className="w-4 h-4 mx-auto" />
                        </td>

                        {/* Title and Thumbnail Preview */}
                        <td className="py-4 px-6 flex items-center space-x-3 rtl:space-x-reverse">
                          <div className="w-16 h-10 rounded-xl bg-purple-950/80 border border-purple-400/30 overflow-hidden shrink-0 flex items-center justify-center relative shadow-md">
                            {bgImage ? (
                              <img src={bgImage} alt={p.mediaTitle} className="w-full h-full object-cover group-hover:scale-105 transition" />
                            ) : (
                              <Film className="w-5 h-5 text-pink-300" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            {/* Inline Edit in List View */}
                            {editingTitleId === p.id ? (
                              <div className="flex items-center space-x-1.5 rtl:space-x-reverse my-1" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="text"
                                  dir="auto"
                                  value={newTitleValue}
                                  onChange={(e) => setNewTitleValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveTitle(p.id);
                                    if (e.key === 'Escape') handleCancelInlineEditTitle();
                                  }}
                                  autoFocus
                                  disabled={isSavingTitle}
                                  className="flex-1 bg-slate-950 border border-purple-500 rounded-xl px-2.5 py-1 text-xs text-white font-black outline-none focus:ring-2 focus:ring-pink-500 min-w-[180px]"
                                  placeholder={isAr ? 'عنوان الحلقة الجديد...' : 'New episode title...'}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveTitle(p.id)}
                                  disabled={isSavingTitle || !newTitleValue.trim()}
                                  className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-sm disabled:opacity-50"
                                  title={isAr ? 'حفظ (Enter)' : 'Save (Enter)'}
                                >
                                  {isSavingTitle ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelInlineEditTitle}
                                  disabled={isSavingTitle}
                                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                                  title={isAr ? 'إلغاء (Esc)' : 'Cancel (Esc)'}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1.5 rtl:space-x-reverse group/rowtitle">
                                <h4 className="text-sm font-black text-white group-hover:text-pink-300 transition truncate max-w-xs">
                                  {p.mediaTitle}
                                </h4>
                                {canEditTitle(p) && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartInlineEditTitle(p);
                                    }}
                                    className="p-1 rounded-lg text-slate-500 hover:text-pink-300 hover:bg-purple-900/50 transition opacity-0 group-hover:opacity-100 group-hover/rowtitle:opacity-100"
                                    title={isAr ? 'تعديل عنوان الحلقة' : 'Edit episode title'}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}

                            <div className="flex items-center space-x-2 rtl:space-x-reverse text-[11px] text-slate-400">
                              <span>{getCategoryLabel(p.projectType)}</span>
                              <span>•</span>
                              <span>{lineCount} {isAr ? 'سطر' : 'lines'}</span>
                            </div>
                          </div>
                        </td>

                        {/* Owner (Admin only) */}
                        {user?.role === 'Admin' && (
                          <td className="py-4 px-6">
                            {p.ownerName ? (
                              <span className="inline-flex items-center space-x-1 rtl:space-x-reverse px-2 py-0.5 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-300 text-[10px]">
                                <UserCheck className="w-3 h-3 text-amber-400" />
                                <span>{p.ownerName}</span>
                              </span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                        )}

                        {/* Status */}
                        <td className="py-4 px-6">
                          {p.status === 'ready' ? (
                            <span className="inline-flex items-center space-x-1 rtl:space-x-reverse px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px]">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>{isAr ? 'جاهز' : 'Ready'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 rtl:space-x-reverse px-2.5 py-0.5 rounded-full bg-pink-950/80 border border-pink-500/40 text-pink-300 text-[11px] animate-pulse">
                              <Sparkles className="w-3 h-3 text-pink-400" />
                              <span>{p.status || 'Processing'}</span>
                            </span>
                          )}
                        </td>

                        {/* Audit Progress */}
                        <td className="py-4 px-6">
                          <div className="w-28 space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-300">{progressPercent}%</span>
                              <span className="text-purple-300">{approvedCount}/{lineCount}</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${progressPercent === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-pink-500 to-purple-500'}`}
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="py-4 px-6 text-slate-400 text-xs">
                          {new Date(p.createdAt || p.id).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
                            year: 'numeric', month: 'short', day: 'numeric'
                          })}
                        </td>

                        {/* Actions (All available in list view) */}
                        <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center space-x-1.5 rtl:space-x-reverse">
                            <button
                              onClick={() => onEditProject(p)}
                              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition flex items-center space-x-1 rtl:space-x-reverse"
                              title={isAr ? 'فتح المحرر' : 'Open Editor'}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>{isAr ? 'فتح المحرر' : 'Edit'}</span>
                            </button>

                            {/* Edit Title Button (Owner or Admin) */}
                            {canEditTitle(p) && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditTitleModal(p)}
                                className="p-2 rounded-xl bg-slate-800 hover:bg-purple-900 border border-slate-700 text-slate-300 hover:text-white transition"
                                title={isAr ? 'تعديل عنوان الفيديو' : 'Edit episode title'}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {(user?.role === 'Admin' || user?.role === 'Translator') && (
                              <button
                                onClick={() => onOpenAssignAuditor(p)}
                                className="p-2 rounded-xl bg-slate-800 hover:bg-purple-900 border border-slate-700 text-slate-300 hover:text-white transition"
                                title={isAr ? 'تعيين مدقق' : 'Assign Auditor'}
                              >
                                <Shield className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {(!user || user.role === 'Admin' || p.ownerId === user?.id) && (
                              <button
                                onClick={() => handleOpenMoveModal(p)}
                                className="p-2 rounded-xl bg-slate-800 hover:bg-purple-900 border border-slate-700 text-slate-300 hover:text-white transition"
                                title={isAr ? 'نقل إلى مجلد آخر' : 'Move to another folder'}
                              >
                                <FolderInput className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => setDeletingProjectId(p.id)}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/80 border border-slate-700 text-slate-400 hover:text-rose-300 transition"
                              title={isAr ? 'حذف' : 'Delete'}
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

      {/* Edit Episode Title Modal */}
      {editingModalProject && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-slate-900 theme-light:bg-white p-6 sm:p-7 rounded-3xl border border-purple-500/30 max-w-md w-full shadow-2xl relative overflow-hidden space-y-5">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500" />

            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <div className="w-12 h-12 rounded-2xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-md shrink-0">
                <Pencil className="w-6 h-6 text-pink-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black text-white theme-light:text-slate-950 truncate">
                  {isAr ? 'تعديل عنوان الفيديو' : 'Edit Episode Title'}
                </h3>
                <p className="text-xs text-slate-400 theme-light:text-slate-600 truncate">
                  {editingModalProject.projectName}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-300 theme-light:text-slate-950 mb-2">
                {isAr ? 'العنوان الجديد للحلقة / الفيديو:' : 'New Episode / Video Title:'}
              </label>
              <input
                type="text"
                dir="auto"
                value={newTitleValue}
                onChange={(e) => setNewTitleValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle(editingModalProject.id);
                  if (e.key === 'Escape') setEditingModalProject(null);
                }}
                autoFocus
                disabled={isSavingTitle}
                placeholder={isAr ? 'اكتب عنوان الفيديو الجديد...' : 'Enter new episode title...'}
                className="w-full bg-slate-950 theme-light:bg-white border border-slate-700 theme-light:border-purple-300 focus:border-purple-500 rounded-2xl px-4 py-3 text-sm text-white theme-light:text-slate-950 font-bold outline-none transition"
              />
            </div>

            {titleError && (
              <div className="flex items-center space-x-2 rtl:space-x-reverse text-xs text-rose-400 bg-rose-950/50 border border-rose-500/30 p-3 rounded-xl font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{titleError}</span>
              </div>
            )}

            <div className="flex space-x-3 rtl:space-x-reverse pt-2">
              <button
                type="button"
                onClick={() => setEditingModalProject(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 theme-light:border-slate-300 text-slate-300 theme-light:text-slate-700 font-black hover:bg-slate-800 theme-light:hover:bg-slate-100 transition"
                disabled={isSavingTitle}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => handleSaveTitle(editingModalProject.id)}
                disabled={isSavingTitle || !newTitleValue.trim()}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:opacity-90 text-white font-black shadow-lg hover:shadow-purple-500/25 transition disabled:opacity-50 flex items-center justify-center space-x-2 rtl:space-x-reverse"
              >
                {isSavingTitle ? (
                  <span>{isAr ? 'جاري الحفظ...' : 'Saving...'}</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{isAr ? 'حفظ العنوان' : 'Save Title'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Project to Another Folder Modal */}
      {movingProject && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-slate-900 theme-light:bg-white p-6 sm:p-7 rounded-3xl border border-purple-500/30 max-w-md w-full shadow-2xl relative overflow-hidden space-y-5">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500" />

            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <div className="w-12 h-12 rounded-2xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-md shrink-0">
                <FolderInput className="w-6 h-6 text-pink-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black text-white theme-light:text-slate-950 truncate">
                  {isAr ? 'نقل الفيديو إلى مجلد آخر' : 'Move Video to Another Folder'}
                </h3>
                <p className="text-xs text-slate-400 theme-light:text-slate-600 truncate">
                  {movingProject.mediaTitle}
                </p>
              </div>
            </div>

            {/* Current Folder Info */}
            <div className="p-3 rounded-2xl bg-slate-950/60 theme-light:bg-purple-50/70 border border-purple-500/20 text-xs">
              <span className="text-slate-400 theme-light:text-slate-600 font-bold">
                {isAr ? 'المجلد الحالي:' : 'Current Folder:'}{' '}
              </span>
              <span className="text-purple-300 theme-light:text-purple-900 font-extrabold mr-1 rtl:ml-1">
                {movingProject.projectName || (isAr ? 'غير مصنف' : 'Uncategorized')}
              </span>
            </div>

            {/* Mode Selector */}
            <div>
              <label className="block text-xs font-black text-slate-300 theme-light:text-slate-950 mb-2">
                {isAr ? 'اختر وجهة النقل:' : 'Select Destination Folder:'}
              </label>
              
              <div className="flex space-x-2 rtl:space-x-reverse mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setMoveFolderMode('existing');
                    const currentUserId = user?.id || 'usr_guest';
                    const userProjects = projects.filter(p => (p.ownerId || 'usr_guest') === currentUserId);
                    const allFolders = [...new Set(userProjects.map(p => p.projectName).filter(Boolean))].filter(f => f !== movingProject.projectName);
                    if (allFolders.length > 0) setTargetFolderName(allFolders[0]);
                  }}
                  disabled={[...new Set(projects.filter(p => (p.ownerId || 'usr_guest') === (user?.id || 'usr_guest')).map(p => p.projectName).filter(Boolean))].filter(f => f !== movingProject.projectName).length === 0}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${moveFolderMode === 'existing' ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-800 theme-light:bg-slate-200 text-slate-400 theme-light:text-slate-600 hover:bg-slate-700'} ${[...new Set(projects.filter(p => (p.ownerId || 'usr_guest') === (user?.id || 'usr_guest')).map(p => p.projectName).filter(Boolean))].filter(f => f !== movingProject.projectName).length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isAr ? 'مجلد موجود' : 'Existing Folder'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMoveFolderMode('new');
                    setTargetFolderName('');
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${moveFolderMode === 'new' ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-800 theme-light:bg-slate-200 text-slate-400 theme-light:text-slate-600 hover:bg-slate-700'}`}
                >
                  {isAr ? 'إنشاء مجلد جديد' : 'New Folder'}
                </button>
              </div>

              {moveFolderMode === 'existing' ? (
                <select
                  dir={isAr ? 'rtl' : 'ltr'}
                  value={targetFolderName}
                  onChange={(e) => setTargetFolderName(e.target.value)}
                  className="w-full bg-slate-950 theme-light:bg-white border border-slate-700 theme-light:border-purple-300 focus:border-purple-500 rounded-2xl px-4 py-3 text-sm text-white theme-light:text-slate-950 font-bold outline-none transition"
                >
                  {[...new Set(projects.filter(p => (p.ownerId || 'usr_guest') === (user?.id || 'usr_guest')).map(p => p.projectName).filter(Boolean))]
                    .filter(f => f !== movingProject.projectName)
                    .map(folder => (
                      <option key={folder} value={folder}>{folder}</option>
                    ))}
                </select>
              ) : (
                <input
                  type="text"
                  dir={isAr ? 'rtl' : 'ltr'}
                  value={targetFolderName}
                  onChange={(e) => setTargetFolderName(e.target.value)}
                  placeholder={isAr ? 'اكتب اسم المجلد الجديد...' : 'Type new folder name...'}
                  className="w-full bg-slate-950 theme-light:bg-white border border-slate-700 theme-light:border-purple-300 focus:border-purple-500 rounded-2xl px-4 py-3 text-sm text-white theme-light:text-slate-950 font-bold outline-none transition"
                />
              )}
            </div>

            {moveError && (
              <div className="flex items-center space-x-2 rtl:space-x-reverse text-xs text-rose-400 bg-rose-950/50 border border-rose-500/30 p-3 rounded-xl font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{moveError}</span>
              </div>
            )}

            <div className="flex space-x-3 rtl:space-x-reverse pt-2">
              <button
                type="button"
                onClick={() => setMovingProject(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 theme-light:border-slate-300 text-slate-300 theme-light:text-slate-700 font-black hover:bg-slate-800 theme-light:hover:bg-slate-100 transition"
                disabled={isMoving}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmMove}
                disabled={isMoving || !targetFolderName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:opacity-90 text-white font-black shadow-lg hover:shadow-purple-500/25 transition disabled:opacity-50 flex items-center justify-center space-x-2 rtl:space-x-reverse"
              >
                {isMoving ? (
                  <span>{isAr ? 'جاري النقل...' : 'Moving...'}</span>
                ) : (
                  <>
                    <FolderInput className="w-4 h-4" />
                    <span>{isAr ? 'نقل الآن' : 'Move Now'}</span>
                  </>
                )}
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
