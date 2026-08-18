import React, { useState, useRef } from 'react';
import { Save, Download, CheckCircle2, Circle, Volume2, Film, Layers, ArrowLeft, Languages, Trash2, Clock, MessageSquare, AlertTriangle, X, FileText, Check } from 'lucide-react';

export default function SubtitleWorkspace({ initialProject, onSaveAndClose, lang = 'en' }) {
  const [project, setProject] = useState(initialProject);
  const [subtitles, setSubtitles] = useState(initialProject?.subtitles || []);
  const [activeSubId, setActiveSubId] = useState(null);

  // Video Duration & Time update state for active subtitle preview overlay
  const [videoDurationSeconds, setVideoDurationSeconds] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // 3-Language Subtitle Radio Selection for Video Preview ('ja', 'en', 'ar')
  const [activeSrtLang, setActiveSrtLang] = useState('ar');

  // Modal / Action states
  const [isSaving, setIsSaving] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [exportFormat, setExportFormat] = useState('srt'); // 'srt' or 'ass'
  const [exportLang, setExportLang] = useState('ar'); // 'ar', 'en', 'ja'

  const videoRef = useRef(null);
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

  // Toggle Human Check Approved Status
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
  const handleSaveAndClose = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/project/${project.id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtitles })
      });
      const data = await res.json();
      if (data.success) {
        onSaveAndClose();
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
        method: 'DELETE'
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

    const cleanName = String(project?.projectName || 'subtitles').replace(/[/\\?%*:|"<>]/g, '_');
    const fileName = `${cleanName}_${exportLang}.${exportFormat}`;

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
      
      {/* Top Header: Video Info & High-Contrast Action Buttons */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-panel p-5 rounded-3xl border border-purple-500/20 shadow-xl" dir={isAr ? 'rtl' : 'ltr'}>
        
        {/* Exit button */}
        <button
          onClick={onSaveAndClose}
          className="flex items-center space-x-2 rtl:space-x-reverse text-xs font-black text-white bg-slate-900 theme-light:bg-purple-700 px-4 py-2.5 rounded-xl border border-slate-700 theme-light:border-purple-800 shadow-md transition hover:scale-105 wizard-white-text"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
          <span>{isAr ? 'الخروج من محرر الترجمة' : 'Exit Workspace'}</span>
        </button>

        {/* Title & Media Type */}
        <div className={isAr ? 'md:text-right' : 'md:text-left'}>
          <div className="inline-flex items-center space-x-2 rtl:space-x-reverse bg-purple-950 theme-light:bg-purple-700 px-3.5 py-1.5 rounded-full border border-purple-500/30 theme-light:border-purple-800 text-purple-200 theme-light:text-white text-xs font-black shadow-sm">
            <Layers className="w-3.5 h-3.5 text-pink-400 theme-light:text-yellow-300" />
            <span>{project.projectType} • {project.projectName}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white theme-light:text-slate-950 mt-1">
            {project.mediaTitle}
          </h2>
        </div>

        {/* Action Buttons (Delete, Export, Save) */}
        <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
          
          {/* Delete Project Button */}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center space-x-1.5 rtl:space-x-reverse px-3.5 py-2.5 rounded-xl bg-rose-950/60 theme-light:bg-rose-600 border border-rose-500/30 text-white font-black text-xs shadow-md transition hover:scale-105 wizard-white-text"
            title={isAr ? 'حذف المشروع' : 'Delete Project'}
          >
            <Trash2 className="w-4 h-4 text-white" />
            <span className="hidden sm:inline">{isAr ? 'حذف' : 'Delete'}</span>
          </button>

          {/* Export Button */}
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl bg-slate-900 theme-light:bg-purple-900 border border-slate-700 theme-light:border-purple-700 text-white font-black text-xs sm:text-sm shadow-md transition hover:scale-105 wizard-white-text"
          >
            <Download className="w-4 h-4 text-purple-300" />
            <span>{isAr ? 'تصدير الملفات (.SRT/.ASS)' : 'Export (.SRT/.ASS)'}</span>
          </button>

          {/* Save & Exit Button */}
          <button
            onClick={handleSaveAndClose}
            disabled={isSaving}
            className="flex items-center space-x-2 rtl:space-x-reverse px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:opacity-90 text-white text-xs sm:text-sm font-black shadow-lg shadow-purple-500/20 transition wizard-white-text border border-purple-400/30"
          >
            <Save className="w-4 h-4 text-pink-200" />
            <span>{isSaving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ والخروج' : 'Save & Exit')}</span>
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
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-inner border border-slate-800">
            <video
              ref={videoRef}
              src={project.videoUrl}
              controls
              playsInline
              preload="metadata"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={() => setVideoDurationSeconds(videoRef.current?.duration || 0)}
              className="w-full h-full object-contain"
            />

            {/* DYNAMIC SUBTITLE OVERLAY BASED ON RADIO SELECTION */}
            {previewOverlayText && (
              <div className="absolute bottom-10 left-3 right-3 z-20 flex items-center justify-center text-center pointer-events-none">
                <p
                  className="text-sm sm:text-base font-black leading-snug anime-subtitle-overlay tracking-wide bg-black/60 px-3 py-1.5 rounded-xl border border-white/20"
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

      {/* EXPORT MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/30 space-y-6 shadow-2xl" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white theme-light:text-slate-950">
                {isAr ? 'تصدير ملف الترجمة' : 'Export Subtitle File'}
              </h3>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-300 theme-light:text-slate-900 mb-1.5">{isAr ? 'لغة الملف' : 'Subtitle Language'}</label>
                <div className="grid grid-cols-3 gap-2">
                  {['ar', 'en', 'ja'].map(l => (
                    <button
                      key={l}
                      onClick={() => setExportLang(l)}
                      className={`py-2 rounded-xl border text-center transition ${
                        exportLang === l ? 'bg-purple-600 text-white border-purple-500 font-bold wizard-white-text' : 'bg-slate-900 theme-light:bg-white text-slate-400 theme-light:text-slate-900 border-slate-800'
                      }`}
                    >
                      {l === 'ar' ? (isAr ? 'العربية' : 'Arabic') : l === 'en' ? (isAr ? 'الإنجليزية' : 'English') : (isAr ? 'اليابانية' : 'Japanese')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 theme-light:text-slate-900 mb-1.5">{isAr ? 'صيغة الملف' : 'Export Format'}</label>
                <div className="grid grid-cols-2 gap-2">
                  {['srt', 'ass'].map(f => (
                    <button
                      key={f}
                      onClick={() => setExportFormat(f)}
                      className={`py-2 rounded-xl border text-center font-bold uppercase transition ${
                        exportFormat === f ? 'bg-purple-600 text-white border-purple-500 wizard-white-text' : 'bg-slate-900 theme-light:bg-white text-slate-400 theme-light:text-slate-900 border-slate-800'
                      }`}
                    >
                      .{f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-2">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 theme-light:bg-slate-100 text-slate-300 theme-light:text-slate-800 border border-slate-700 text-xs font-semibold"
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
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs shadow-lg wizard-white-text"
              >
                {isAr ? 'تحميل الملف الآن' : 'Download File Now'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
