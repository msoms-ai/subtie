import React, { useState, useRef, useEffect } from 'react';
import { Save, Download, CheckCircle2, Circle, Volume2, Film, Layers, ArrowLeft, Languages, Trash2, Clock, MessageSquare, AlertTriangle, X, FileText, Check, Maximize, Minimize, RefreshCcw, Plus } from 'lucide-react';
import ReSubtitleModal from './ReSubtitleModal.jsx';

export default function SubtitleWorkspace({ initialProject, onSaveAndClose, onAddAnotherEpisode, user, lang = 'en' }) {
  const [project, setProject] = useState(initialProject);
  const [subtitles, setSubtitles] = useState(initialProject?.subtitles || []);
  const [activeSubId, setActiveSubId] = useState(null);

  // Video Duration & Time update state for active subtitle preview overlay
  const [videoDurationSeconds, setVideoDurationSeconds] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [toastMsg, setToastMsg] = useState(null);

  // 3-Language Subtitle Radio Selection for Video Preview ('ja', 'en', 'ar')
  const [activeSrtLang, setActiveSrtLang] = useState('ar');

  // Modal / Action states
  const [isSaving, setIsSaving] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [exportFormat, setExportFormat] = useState('srt'); // 'srt' or 'ass'
  const [exportLang, setExportLang] = useState('ar'); // 'ar', 'en', 'ja'
  const [showReSubtitleModal, setShowReSubtitleModal] = useState(false);

  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isAr = lang === 'ar';

  // Seek video player to exact timestamp when clicking a line
  const handleSelectLine = (sub) => {
    setActiveSubId(sub.id);
    if (videoRef.current) {
      videoRef.current.currentTime = sub.startSeconds || 0;
      videoRef.current.play();
    }
  };

  // Video Player Time Update handler
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      if (videoContainerRef.current?.requestFullscreen) {
        videoContainerRef.current.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Toggle Human Check Approved Status
  const handleApproveAll = () => { setSubtitles(prev => prev.map(sub => ({ ...sub, approved: true }))); };

  const handleToggleApproved = (id) => {
    setSubtitles(prev =>
      prev.map(sub => sub.id === id ? { ...sub, approved: !sub.approved } : sub)
    );
  };

  // Update Japanese Line
  const handleJapaneseChange = (id, newText) => {
    setSubtitles(prev =>
      prev.map(sub => sub.id === id ? { ...sub, japaneseText: newText } : sub)
    );
  };

  // Update English Translation
  const handleEnglishChange = (id, newText) => {
    setSubtitles(prev =>
      prev.map(sub => sub.id === id ? { ...sub, englishText: newText } : sub)
    );
  };

  // Update Arabic Translation
  const handleArabicChange = (id, newText) => {
    setSubtitles(prev =>
      prev.map(sub => sub.id === id ? { ...sub, arabicText: newText } : sub)
    );
  };

  // Save project file & 3 SRT files in project folder, close editor, and return
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/project/${project.id}/save`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(user?.id ? { 'x-user-id': user.id } : {})
        },
        body: JSON.stringify({ subtitles })
      });
      const data = await res.json();
      if (data.success) {
        setToastMsg(lang === 'ar' ? 'تم حفظ التعديلات بنجاح' : 'Changes saved successfully!');
        setTimeout(() => setToastMsg(null), 3000);
      } else {
        alert(data.error || 'Failed to save.');
      }
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save project state.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete project recursively on server
  const handleDeleteProject = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/project/${project.id}`, {
        method: 'DELETE',
        headers: user?.id ? { 'x-user-id': user.id } : {}
      });
      const data = await res.json();
      if (data.success) {
        setShowDeleteModal(false);
        onSaveAndClose();
      } else {
        alert(data.error || 'Failed to delete project.');
      }
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete project.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Generate & Download Subtitle File (.srt or .ass) with Dual Redundant Download Engines
  const handleTriggerExport = async (e) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }

    // 1. Auto-save current subtitle edits to server
    try {
      await fetch(`/api/project/${project.id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtitles })
      });
    } catch (err) {
      console.error('Pre-export save error:', err);
    }

    // 2. Generate local UTF-8 BOM content
    const BOM = '\uFEFF';
    let content = BOM;
    const safeSubs = Array.isArray(subtitles) ? subtitles : [];

    if (exportFormat === 'ass') {
      content += `[Script Info]\nTitle: ${project?.projectName || 'Subtie Fansub'}\nScriptType: v4.00+\nFormat: Dialogue\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
      safeSubs.forEach((sub) => {
        const text = exportLang === 'en' ? (sub?.englishText || '') : exportLang === 'ja' ? (sub?.japaneseText || '') : (sub?.arabicText || '');
        const rawStart = String(sub?.startTime || '00:00:00,000').trim().replace('.', ',');
        const rawEnd = String(sub?.endTime || '00:00:05,000').trim().replace('.', ',');
        const start = rawStart.replace(',', '.').substring(0, 10);
        const end = rawEnd.replace(',', '.').substring(0, 10);
        content += `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}\n`;
      });
    } else {
      // Default: SRT format
      safeSubs.forEach((sub, idx) => {
        const text = exportLang === 'en' ? (sub?.englishText || '') : exportLang === 'ja' ? (sub?.japaneseText || '') : (sub?.arabicText || '');
        let start = String(sub?.startTime || '00:00:00,000').trim().replace('.', ',');
        let end = String(sub?.endTime || '00:00:05,000').trim().replace('.', ',');
        if (start.length === 8) start += ',000';
        if (end.length === 8) end += ',000';
        content += `${idx + 1}\n${start} --> ${end}\n${text}\n\n`;
      });
    }

    let safeProj = String(project?.projectName || 'Project').replace(/[/\\?%*:|"<>]/g, '-').trim();
    let safeEp = String(project?.mediaTitle || 'Episode').replace(/[/\\?%*:|"<>]/g, '-').trim();
    safeEp = safeEp.replace(/\.(mp4|mkv|avi|mov|webm)$/i, '');
    const fileName = `[${safeProj}]-[${safeEp}].${exportFormat}`;

    // 3. Engine A: Direct Anchor Download with Blob
    try {
      const blob = new Blob([content], { type: 'application/octet-stream;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        if (document.body.contains(a)) document.body.removeChild(a);
      }, 500);
    } catch (err) {
      console.error('Blob download engine failed, triggering iframe backup:', err);
      // Engine B: Hidden iFrame Backup
      const exportUrl = `/api/project/${project.id}/export?format=${exportFormat}&lang=${exportLang}`;
      let iframe = document.getElementById('hidden-download-iframe');
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'hidden-download-iframe';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
      }
      iframe.src = exportUrl;
    }

    setShowExportModal(false);
  };

  const totalLines = subtitles.length;
  const approvedCount = subtitles.filter(s => s.approved).length;

  const formatDuration = (secs) => {
    if (!secs || isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Find active subtitle line for video player preview
  const activeCue = subtitles.find(s => {
    const start = s.startSeconds ?? 0;
    const end = s.endSeconds ?? (start + 3);
    return currentTime >= start && currentTime <= end;
  });

  const previewOverlayText = activeCue ? (
    activeSrtLang === 'ja' ? activeCue.japaneseText :
    activeSrtLang === 'en' ? activeCue.englishText :
    activeCue.arabicText
  ) : '';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Global Toast Notification */}
      {toastMsg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-emerald-500/90 text-white px-6 py-3 rounded-2xl shadow-xl font-black flex items-center space-x-2 rtl:space-x-reverse border border-emerald-400">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMsg}</span>
        </div>
      )}
      
      {/* Top Header: Video Info & High-Contrast Action Buttons */}
      <div className="flex flex-col xl:flex-row items-center justify-between gap-4 glass-panel p-4 sm:p-5 rounded-3xl border border-purple-500/20 shadow-xl sticky top-4 z-30 backdrop-blur-3xl" dir={isAr ? 'rtl' : 'ltr'}>
        
        {/* Left Section: Back & Add Episode */}
        <div className="flex w-full xl:w-auto items-center justify-between xl:justify-start gap-3">
          <button
            onClick={onSaveAndClose}
            className="flex items-center justify-center space-x-1.5 rtl:space-x-reverse px-4 py-2.5 rounded-xl bg-slate-900 theme-light:bg-purple-700 border border-slate-700 theme-light:border-purple-800 text-white font-black text-xs sm:text-sm shadow-md transition hover:scale-105"
            title={isAr ? 'الخروج' : 'Exit'}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{isAr ? 'رجوع' : 'Back'}</span>
          </button>
          
          {onAddAnotherEpisode && (
            <button
              onClick={onAddAnotherEpisode}
              className="flex items-center justify-center space-x-1.5 rtl:space-x-reverse px-4 py-2.5 rounded-xl bg-sky-900/50 theme-light:bg-sky-600 border border-sky-700/50 theme-light:border-sky-500 text-sky-200 theme-light:text-white font-black text-xs sm:text-sm shadow-sm transition hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{isAr ? 'إضافة حلقة' : 'Add Episode'}</span>
            </button>
          )}
        </div>

        {/* Center Section: Title & Media Type */}
        <div className={`flex-1 min-w-0 flex flex-col items-center text-center px-2`}>
          <div className="inline-flex items-center space-x-2 rtl:space-x-reverse bg-purple-950 theme-light:bg-purple-700 px-3.5 py-1.5 rounded-full border border-purple-500/30 theme-light:border-purple-800 text-purple-200 theme-light:text-white text-xs font-black shadow-sm mb-1">
            <Layers className="w-3 h-3 text-pink-400 theme-light:text-yellow-300" />
            <span className="truncate max-w-[200px] sm:max-w-[400px]">{project.projectType} • {project.projectName}</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white theme-light:text-slate-950 truncate max-w-full px-4">
            {project.mediaTitle}
          </h2>
        </div>

        {/* Right Section: Action Buttons */}
        <div className="flex flex-wrap items-center justify-center xl:justify-end gap-2 sm:gap-3 w-full xl:w-auto">
          
          {/* Delete Project */}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center justify-center p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-rose-950/60 theme-light:bg-rose-600 border border-rose-500/30 text-rose-200 theme-light:text-white font-black text-xs sm:text-sm shadow-md transition hover:bg-rose-900/80 hover:scale-105"
            title={isAr ? 'حذف المشروع' : 'Delete Project'}
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden xl:inline ltr:ml-1.5 rtl:mr-1.5">{isAr ? 'حذف' : 'Delete'}</span>
          </button>

          {/* ReSubtitle */}
          <button
            onClick={() => setShowReSubtitleModal(true)}
            className="flex items-center justify-center p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-amber-900/60 theme-light:bg-amber-500 border border-amber-500/30 text-amber-300 theme-light:text-white font-black text-xs sm:text-sm shadow-md transition hover:bg-amber-800/80 hover:scale-105"
            title={isAr ? 'إعادة الترجمة' : 'ReSubtitle'}
          >
            <RefreshCcw className="w-4 h-4" />
            <span className="hidden lg:inline ltr:ml-1.5 rtl:mr-1.5">{isAr ? 'إعادة الترجمة' : 'ReSubtitle'}</span>
          </button>
          
          {/* Export */}
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center justify-center p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-slate-800 theme-light:bg-slate-700 border border-slate-600 theme-light:border-slate-500 text-white font-black text-xs sm:text-sm shadow-md transition hover:bg-slate-700 hover:scale-105"
            title={isAr ? 'تصدير الملفات' : 'Export'}
          >
            <Download className="w-4 h-4 text-purple-300 theme-light:text-purple-200" />
            <span className="hidden lg:inline ltr:ml-1.5 rtl:mr-1.5">{isAr ? 'تصدير' : 'Export'}</span>
          </button>

          {/* Approve All */}
          <button
            onClick={handleApproveAll}
            className="flex items-center justify-center p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-emerald-900/60 theme-light:bg-emerald-600 border border-emerald-500/30 text-emerald-200 theme-light:text-white font-black text-xs sm:text-sm shadow-md transition hover:bg-emerald-800/80 hover:scale-105"
            title={isAr ? 'اعتماد الكل' : 'Approve All'}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span className="hidden xl:inline ltr:ml-1.5 rtl:mr-1.5">{isAr ? 'اعتماد الكل' : 'Approve All'}</span>
          </button>

          {/* Save & Exit */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:opacity-90 text-white font-black text-xs sm:text-sm shadow-lg shadow-purple-500/20 transition disabled:opacity-50 border border-purple-400/30"
          >
            <Save className="w-4 h-4 text-pink-200" />
            <span className="ltr:ml-1.5 rtl:mr-1.5">{isSaving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ' : 'Save')}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Loaded Video Player, 3 SRT Radio Selector Bar & Stats */}
        <div className="lg:col-span-5 glass-panel-glow rounded-3xl p-4 border border-purple-500/30 shadow-2xl sticky top-24 space-y-4">
          <div className="flex items-center justify-between px-2" dir={isAr ? 'rtl' : 'ltr'}>
            <span className="text-xs font-black text-white theme-light:text-slate-950 flex items-center space-x-1.5 rtl:space-x-reverse">
              <Film className="w-4 h-4 text-purple-400 theme-light:text-purple-700" />
              <span>{isAr ? 'مشغل الفيديو' : 'Loaded Media Player'}</span>
            </span>
            <span className="text-[11px] text-emerald-300 theme-light:text-white bg-emerald-950 theme-light:bg-emerald-700 px-3 py-0.5 rounded-full border border-emerald-500/30 font-black shadow-sm">
              {approvedCount}/{totalLines} {isAr ? 'معتمد' : 'Approved'}
            </span>
          </div>

          {/* HTML5 Video Player with Live Subtitle Overlay */}
          <div 
            ref={videoContainerRef}
            className={`relative w-full rounded-2xl overflow-hidden bg-black shadow-inner border border-slate-800 flex items-center justify-center ${isFullscreen ? 'h-screen' : 'aspect-video'}`}
          >
            <video
              ref={videoRef}
              src={project.videoUrl}
              controls
              controlsList="nofullscreen"
              playsInline
              webkit-playsinline="true"
              preload="metadata"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={() => setVideoDurationSeconds(videoRef.current?.duration || 0)}
              className="w-full h-full object-contain"
            />
            
            {/* Custom Fullscreen Button */}
            <button
              onClick={toggleFullScreen}
              className="absolute top-4 right-4 z-30 bg-black/60 text-white p-2.5 rounded-xl hover:bg-black/90 hover:scale-105 transition border border-white/20 shadow-lg backdrop-blur-md"
              title={isFullscreen ? (isAr ? 'إنهاء ملء الشاشة' : 'Exit Fullscreen') : (isAr ? 'ملء الشاشة' : 'Fullscreen')}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>

            {/* DYNAMIC SUBTITLE OVERLAY BASED ON RADIO SELECTION */}
            {previewOverlayText && (
              <div className={`absolute left-3 right-3 z-20 flex items-center justify-center text-center pointer-events-none ${isFullscreen ? 'bottom-24' : 'bottom-10'}`}>
                <p
                  className={`${isFullscreen ? 'text-2xl sm:text-4xl' : 'text-sm sm:text-base'} font-black leading-snug anime-subtitle-overlay tracking-wide bg-black/60 px-4 py-2 rounded-xl border border-white/20 drop-shadow-2xl`}
                  dir={activeSrtLang === 'ar' ? 'rtl' : 'ltr'}
                >
                  {previewOverlayText}
                </p>
              </div>
            )}
          </div>

          {/* 3 SRT VERSIONS RADIO SELECTION BAR */}
          <div className="p-3 rounded-2xl bg-purple-950/60 theme-light:bg-purple-100 border border-purple-500/30 theme-light:border-purple-300 shadow-sm space-y-2" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-purple-200 theme-light:text-purple-950 flex items-center space-x-1.5 rtl:space-x-reverse">
                <Languages className="w-4 h-4 text-pink-400 theme-light:text-purple-700" />
                <span>{isAr ? 'ترجمة الفك والتزامن (ملف SRT):' : 'Preview Subtitle Language:'}</span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <label className={`flex items-center justify-center space-x-1.5 rtl:space-x-reverse p-2.5 rounded-xl border-2 cursor-pointer transition ${
                activeSrtLang === 'ja'
                  ? 'bg-gradient-to-r from-purple-700 via-pink-600 to-indigo-700 text-white border-purple-400 font-black shadow-md wizard-white-text'
                  : 'bg-purple-950 theme-light:bg-purple-800 text-white border-purple-500/40 theme-light:border-purple-600 font-black wizard-white-text hover:bg-purple-800'
              }`}>
                <input
                  type="radio"
                  name="srtLang"
                  value="ja"
                  checked={activeSrtLang === 'ja'}
                  onChange={() => setActiveSrtLang('ja')}
                  className="accent-pink-500 cursor-pointer hidden"
                />
                <span className="text-xs text-white font-black">{isAr ? 'اليابانية' : 'Japanese'}</span>
              </label>

              <label className={`flex items-center justify-center space-x-1.5 rtl:space-x-reverse p-2.5 rounded-xl border-2 cursor-pointer transition ${
                activeSrtLang === 'en'
                  ? 'bg-gradient-to-r from-purple-700 via-pink-600 to-indigo-700 text-white border-purple-400 font-black shadow-md wizard-white-text'
                  : 'bg-purple-950 theme-light:bg-purple-800 text-white border-purple-500/40 theme-light:border-purple-600 font-black wizard-white-text hover:bg-purple-800'
              }`}>
                <input
                  type="radio"
                  name="srtLang"
                  value="en"
                  checked={activeSrtLang === 'en'}
                  onChange={() => setActiveSrtLang('en')}
                  className="accent-pink-500 cursor-pointer hidden"
                />
                <span className="text-xs text-white font-black">{isAr ? 'الإنجليزية' : 'English'}</span>
              </label>

              <label className={`flex items-center justify-center space-x-1.5 rtl:space-x-reverse p-2.5 rounded-xl border-2 cursor-pointer transition ${
                activeSrtLang === 'ar'
                  ? 'bg-gradient-to-r from-purple-700 via-pink-600 to-indigo-700 text-white border-purple-400 font-black shadow-md wizard-white-text'
                  : 'bg-purple-950 theme-light:bg-purple-800 text-white border-purple-500/40 theme-light:border-purple-600 font-black wizard-white-text hover:bg-purple-800'
              }`}>
                <input
                  type="radio"
                  name="srtLang"
                  value="ar"
                  checked={activeSrtLang === 'ar'}
                  onChange={() => setActiveSrtLang('ar')}
                  className="accent-pink-500 cursor-pointer hidden"
                />
                <span className="text-xs text-white font-black">{isAr ? 'العربية' : 'Arabic'}</span>
              </label>
            </div>
          </div>

          {/* Under Video Statistics Box: Video Duration & Line Count */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-purple-950/80 theme-light:bg-purple-100 border border-purple-500/30 theme-light:border-purple-300 text-center" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
              <Clock className="w-4 h-4 text-purple-400 theme-light:text-purple-700 shrink-0" />
              <div className="text-left rtl:text-right">
                <span className="text-[10px] text-purple-300 theme-light:text-purple-950 font-bold block">{isAr ? 'مدة الفيديو' : 'Video Duration'}</span>
                <span className="text-xs font-black text-white theme-light:text-purple-950">{formatDuration(videoDurationSeconds)}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse border-l rtl:border-r rtl:border-l-0 border-purple-500/30 theme-light:border-purple-300 pl-2 rtl:pr-2">
              <MessageSquare className="w-4 h-4 text-pink-400 theme-light:text-pink-700 shrink-0" />
              <div className="text-left rtl:text-right">
                <span className="text-[10px] text-purple-300 theme-light:text-purple-950 font-bold block">{isAr ? 'عدد الأسطر' : 'Total Lines'}</span>
                <span className="text-xs font-black text-white theme-light:text-purple-950">{totalLines} {isAr ? 'سطر' : 'lines'}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: High-Contrast 3-Field Subtitle Line Cards */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between glass-panel px-5 py-3.5 rounded-2xl border border-slate-800 theme-light:border-purple-600" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Languages className="w-5 h-5 text-purple-400 theme-light:text-purple-700" />
              <h3 className="text-sm font-black text-white theme-light:text-slate-950">
                {isAr ? 'مساحة تحرير الترجمة الكلاسيكية' : 'Compact 3-Field Line Editor'}
              </h3>
            </div>
            <span className="text-xs text-purple-300 theme-light:text-purple-900 font-extrabold">
              Japanese • English • Arabic
            </span>
          </div>

          {/* Subtitle Line Cards */}
          <div className="space-y-3">
            {subtitles.map((sub, idx) => {
              const isActive = activeSubId === sub.id;
              return (
                <div
                  key={sub.id}
                  className={`glass-panel p-4 rounded-2xl border transition shadow-md space-y-3 ${
                    isActive
                      ? 'border-purple-500 bg-purple-950/40 theme-light:bg-purple-100 shadow-purple-500/20'
                      : 'border-slate-800 theme-light:border-purple-300 hover:border-purple-500/50'
                  }`}
                >
                  {/* Line Header & Millisecond-Accurate Timestamp */}
                  <div className="flex items-center justify-between" dir={isAr ? 'rtl' : 'ltr'}>
                    <button
                      onClick={() => handleSelectLine(sub)}
                      className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-1.5 rounded-xl bg-purple-950 theme-light:bg-purple-700 text-white border border-purple-500/40 theme-light:border-purple-800 font-mono text-xs font-black shadow-sm wizard-white-text transition hover:scale-105"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-pink-300" />
                      <span>Line #{idx + 1}</span>
                      <span className="text-purple-300">|</span>
                      <span>{sub.startTime} → {sub.endTime}</span>
                    </button>

                    {/* Arabic Localized Approved Button with PURE WHITE CIRCLE ICON */}
                    <button
                      onClick={() => handleToggleApproved(sub.id)}
                      className={`inline-flex items-center space-x-1.5 rtl:space-x-reverse px-4 py-1.5 rounded-full text-xs font-black transition shadow-md wizard-white-text ${
                        sub.approved
                          ? 'bg-emerald-600 text-white border-2 border-emerald-400'
                          : 'bg-purple-950 theme-light:bg-purple-800 text-white border-2 border-purple-400/60 hover:bg-purple-800'
                      }`}
                    >
                      {sub.approved ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-white" />
                          <span className="text-white font-black">{isAr ? 'معتمدة' : 'Approved'}</span>
                        </>
                      ) : (
                        <>
                          <Circle className="w-4 h-4 text-white stroke-[2.5]" />
                          <span className="text-white font-black">{isAr ? 'اعتماد الترجمة' : 'Human Check'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Compact 3 Fields with Same-Line Labels */}
                  <div className="space-y-2 text-xs">
                    
                    {/* Field 1: Japanese (Inline - ALWAYS LTR) */}
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span className={`w-24 shrink-0 font-black uppercase text-purple-400 theme-light:text-purple-950 text-[11px] ${isAr ? 'text-right font-tahoma-arabic' : 'text-left'}`}>
                        {isAr ? 'اليابانية:' : 'Japanese:'}
                      </span>
                      <input
                        type="text"
                        dir="ltr"
                        value={sub.japaneseText || ''}
                        onChange={(e) => handleJapaneseChange(sub.id, e.target.value)}
                        className="flex-1 bg-slate-950 theme-light:bg-white border border-purple-500/40 theme-light:border-purple-400 rounded-xl px-3 py-2 text-xs text-purple-200 theme-light:text-slate-950 font-bold outline-none focus:border-purple-500 transition shadow-sm text-left font-sans"
                      />
                    </div>

                    {/* Field 2: English (Inline - ALWAYS LTR) */}
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span className={`w-24 shrink-0 font-black uppercase text-slate-300 theme-light:text-purple-950 text-[11px] ${isAr ? 'text-right font-tahoma-arabic' : 'text-left'}`}>
                        {isAr ? 'الإنجليزية:' : 'English:'}
                      </span>
                      <input
                        type="text"
                        dir="ltr"
                        value={sub.englishText || ''}
                        onChange={(e) => handleEnglishChange(sub.id, e.target.value)}
                        placeholder={isAr ? 'أدخل الترجمة الإنجليزية...' : 'Enter English translation...'}
                        className="flex-1 bg-slate-950 theme-light:bg-white border border-slate-700 theme-light:border-purple-400 rounded-xl px-3 py-2 text-xs text-white theme-light:text-slate-950 font-bold outline-none focus:border-purple-500 transition shadow-sm text-left font-sans"
                      />
                    </div>

                    {/* Field 3: Arabic (Inline - ALWAYS RTL) */}
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span className={`w-24 shrink-0 font-black uppercase text-pink-400 theme-light:text-purple-950 text-[11px] ${isAr ? 'text-right font-tahoma-arabic' : 'text-left'}`}>
                        {isAr ? 'العربية:' : 'Arabic:'}
                      </span>
                      <input
                        type="text"
                        dir="rtl"
                        value={sub.arabicText || ''}
                        onChange={(e) => handleArabicChange(sub.id, e.target.value)}
                        placeholder="أدخل الترجمة العربية..."
                        className="flex-1 font-tahoma-arabic bg-slate-950 theme-light:bg-white border border-slate-700 theme-light:border-purple-400 rounded-xl px-3 py-2 text-xs text-white theme-light:text-slate-950 font-bold outline-none focus:border-pink-500 transition text-right shadow-sm"
                      />
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* DELETE PROJECT CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-panel p-6 sm:p-8 rounded-3xl border border-rose-500/30 text-center space-y-5 shadow-2xl">
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
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 bg-slate-900 theme-light:bg-slate-100 border border-slate-700 theme-light:border-slate-300 text-slate-300 theme-light:text-slate-800 rounded-xl text-xs font-semibold transition"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDeleteProject}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-500/30 transition flex items-center justify-center space-x-1.5 wizard-white-text"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? (isAr ? 'جاري الحذف...' : 'Deleting...') : (isAr ? 'حذف المشروع' : 'Delete Project')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESUBTITLE MODAL */}
      <ReSubtitleModal
        isOpen={showReSubtitleModal}
        onClose={() => setShowReSubtitleModal(false)}
        project={project}
        videoDurationSeconds={videoDurationSeconds}
        isAr={isAr}
        onComplete={(updatedProject) => {
          setProject(updatedProject);
          setSubtitles(updatedProject.subtitles || []);
          setShowReSubtitleModal(false);
          setToastMsg(isAr ? 'تمت إعادة معالجة الأجزاء المحددة بنجاح!' : 'Selected chunks re-processed successfully!');
          setTimeout(() => setToastMsg(null), 3000);
        }}
      />

      {/* EXPORT MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-md glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/40 space-y-6 shadow-2xl" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-4">
              <h3 className="text-xl font-black text-white theme-light:text-slate-950">
                {isAr ? 'تصدير وتنزيل ملف الترجمة' : 'Export Subtitle File'}
              </h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-slate-300 hover:text-white bg-purple-950 theme-light:bg-purple-800 p-2 rounded-full border border-purple-500/40 transition shadow-md"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="space-y-5 text-xs font-bold">
              <div>
                <label className="block text-purple-200 theme-light:text-purple-950 font-black mb-2">
                  {isAr ? '1. اختر لغة الملف' : '1. Select Subtitle Language'}
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {['ar', 'en', 'ja'].map(l => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setExportLang(l)}
                      className={`py-3 px-2 rounded-2xl border-2 text-center font-black text-xs transition shadow-md wizard-white-text ${
                        exportLang === l
                          ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white border-purple-300 scale-[1.03] shadow-purple-500/30'
                          : 'bg-purple-950 theme-light:bg-purple-800 text-white border-purple-400/80 hover:bg-purple-900'
                      }`}
                    >
                      {l === 'ar' ? (isAr ? 'العربية' : 'Arabic') : l === 'en' ? (isAr ? 'الإنجليزية' : 'English') : (isAr ? 'اليابانية' : 'Japanese')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-purple-200 theme-light:text-purple-950 font-black mb-2">
                  {isAr ? '2. اختر صيغة الملف' : '2. Select Export Format'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['srt', 'ass'].map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setExportFormat(f)}
                      className={`py-3 rounded-2xl border-2 text-center font-black uppercase text-xs sm:text-sm transition shadow-md wizard-white-text ${
                        exportFormat === f
                          ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white border-purple-300 scale-[1.03] shadow-purple-500/30'
                          : 'bg-purple-950 theme-light:bg-purple-800 text-white border-purple-400/80 hover:bg-purple-900'
                      }`}
                    >
                      .{f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 rtl:space-x-reverse pt-4 border-t border-purple-500/20">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-6 py-3 rounded-2xl bg-purple-950 theme-light:bg-purple-800 text-white font-black text-xs border-2 border-purple-400/80 hover:bg-purple-900 transition shadow-md wizard-white-text"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleTriggerExport(e);
                }}
                className="px-7 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:scale-105 text-white font-black text-xs sm:text-sm shadow-xl shadow-purple-500/25 border border-purple-400/40 transition wizard-white-text"
              >
                {isAr ? 'تحميل الملف الآن' : 'Download File Now'}
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
