import React, { useState, useRef, useEffect } from 'react';
import { Save, Download, CheckCircle2, Circle, Volume2, Film, Layers, X, ArrowLeft, Languages, Trash2, Clock, MessageSquare, AlertTriangle } from 'lucide-react';

export default function SubtitleWorkspace({ initialProject, onSaveAndClose, lang = 'en' }) {
  const [project, setProject] = useState(initialProject);
  const [subtitles, setSubtitles] = useState(initialProject?.subtitles || []);
  const [activeSubId, setActiveSubId] = useState(null);

  // Video Duration state
  const [videoDurationSeconds, setVideoDurationSeconds] = useState(0);

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
      videoRef.current.currentTime = sub.startSeconds;
      videoRef.current.play();
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

  // Update Arabic Translation (RTL Tahoma)
  const handleArabicChange = (id, newText) => {
    setSubtitles(prev =>
      prev.map(sub => sub.id === id ? { ...sub, arabicText: newText } : sub)
    );
  };

  // Save project file in project folder, close editor, and return to main landing page
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

  // Export subtitle file as .srt or .ass in selected language and remain on page
  const handleTriggerExport = () => {
    const exportUrl = `/api/project/${project.id}/export?format=${exportFormat}&lang=${exportLang}`;
    window.location.href = exportUrl;
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Header: Video Info on Right & Save / Export / Delete Buttons */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-panel p-5 rounded-3xl border border-purple-500/20">
        
        {/* Left Side: Exit button */}
        <button
          onClick={onSaveAndClose}
          className="flex items-center space-x-2 text-xs text-slate-400 hover:text-white bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isAr ? 'الخروج من محرر الترجمة' : 'Exit Workspace'}</span>
        </button>

        {/* Right Top Side: Title & Type of the Video */}
        <div className="md:text-right">
          <div className="inline-flex items-center space-x-2 bg-purple-950 px-3 py-1 rounded-full border border-purple-500/30 text-purple-300 text-xs font-semibold">
            <Layers className="w-3.5 h-3.5 text-pink-400" />
            <span>{project.projectType} • {project.projectName}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
            {project.mediaTitle}
          </h2>
        </div>

        {/* Top Right Action Buttons (Export, Delete & Save) */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* Delete Project Button */}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center space-x-1.5 px-3 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 text-xs font-semibold transition"
            title={isAr ? 'حذف المشروع' : 'Delete Project'}
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline">{isAr ? 'حذف' : 'Delete'}</span>
          </button>

          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs sm:text-sm font-semibold transition"
          >
            <Download className="w-4 h-4 text-purple-400" />
            <span>{isAr ? 'تصدير الملفات (.SRT/.ASS)' : 'Export (.SRT/.ASS)'}</span>
          </button>

          <button
            onClick={handleSaveAndClose}
            disabled={isSaving}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white text-xs sm:text-sm font-bold shadow-lg shadow-purple-500/20 transition"
          >
            <Save className="w-4 h-4 text-pink-200" />
            <span>{isSaving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ والخروج' : 'Save & Exit')}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Loaded Video Player & Compact Statistics */}
        <div className="lg:col-span-5 glass-panel-glow rounded-3xl p-4 border border-purple-500/30 shadow-2xl sticky top-24 space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
              <Film className="w-4 h-4 text-purple-400" />
              <span>{isAr ? 'مشغل الفيديو' : 'Loaded Media Player'}</span>
            </span>
            <span className="text-[11px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-500/30 font-semibold">
              {approvedCount}/{totalLines} {isAr ? 'معتمد' : 'Approved'}
            </span>
          </div>

          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-inner border border-slate-800">
            <video
              ref={videoRef}
              src={project.videoUrl}
              controls
              playsInline
              preload="metadata"
              onLoadedMetadata={() => setVideoDurationSeconds(videoRef.current?.duration || 0)}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Under Video Statistics Box: Video Duration & Line Count */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
            <div className="flex items-center justify-center space-x-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <div className="text-left">
                <span className="text-[10px] text-slate-400 block">{isAr ? 'مدة الفيديو' : 'Video Duration'}</span>
                <span className="text-xs font-extrabold text-white">{formatDuration(videoDurationSeconds)}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-center space-x-2 border-l border-slate-800 pl-2">
              <MessageSquare className="w-4 h-4 text-pink-400" />
              <div className="text-left">
                <span className="text-[10px] text-slate-400 block">{isAr ? 'عدد الأسطر' : 'Total Lines'}</span>
                <span className="text-xs font-extrabold text-white">{totalLines} {isAr ? 'سطر' : 'lines'}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: Compact 3-Field Subtitle Translation Cards */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between glass-panel px-5 py-3.5 rounded-2xl border border-slate-800">
            <div className="flex items-center space-x-2">
              <Languages className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-bold text-white">
                {isAr ? 'مساحة تحرير الترجمة الكلاسيكية' : 'Compact 3-Field Line Editor'}
              </h3>
            </div>
            <span className="text-xs text-purple-300 font-medium">
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
                  className={`glass-panel p-4 rounded-2xl border transition shadow-md space-y-2.5 ${
                    isActive
                      ? 'border-purple-500 bg-purple-950/30 shadow-purple-500/20'
                      : 'border-slate-800 hover:border-purple-500/30'
                  }`}
                >
                  {/* Line Header & Timestamp */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleSelectLine(sub)}
                      className="flex items-center space-x-2 px-2.5 py-1 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/30 text-purple-300 font-mono text-xs transition"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-pink-400" />
                      <span className="font-semibold">Line #{idx + 1}</span>
                      <span className="text-slate-400">|</span>
                      <span>{sub.startTime.split(',')[0]} → {sub.endTime.split(',')[0]}</span>
                    </button>

                    <button
                      onClick={() => handleToggleApproved(sub.id)}
                      className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                        sub.approved
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                      }`}
                    >
                      {sub.approved ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Approved</span>
                        </>
                      ) : (
                        <>
                          <Circle className="w-3.5 h-3.5 text-slate-500" />
                          <span>Human Check</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Compact 3 Fields with Same-Line Labels */}
                  <div className="space-y-2 text-xs">
                    
                    {/* Field 1: Japanese (Inline) */}
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span className={`w-24 shrink-0 font-bold uppercase text-purple-400 text-[11px] ${isAr ? 'text-right font-tahoma-arabic' : 'text-left'}`}>
                        {isAr ? 'اليابانية:' : 'Japanese:'}
                      </span>
                      <input
                        type="text"
                        dir={isAr ? 'rtl' : 'ltr'}
                        value={sub.japaneseText || ''}
                        onChange={(e) => handleJapaneseChange(sub.id, e.target.value)}
                        className={`flex-1 bg-slate-950 border border-purple-500/30 rounded-xl px-3 py-1.5 text-xs text-purple-200 font-semibold outline-none focus:border-purple-400 transition ${isAr ? 'font-tahoma-arabic text-right' : 'text-left'}`}
                      />
                    </div>

                    {/* Field 2: English (Inline) */}
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span className={`w-24 shrink-0 font-bold uppercase text-slate-400 text-[11px] ${isAr ? 'text-right font-tahoma-arabic' : 'text-left'}`}>
                        {isAr ? 'الإنجليزية:' : 'English:'}
                      </span>
                      <input
                        type="text"
                        dir={isAr ? 'rtl' : 'ltr'}
                        value={sub.englishText || ''}
                        onChange={(e) => handleEnglishChange(sub.id, e.target.value)}
                        placeholder={isAr ? 'أدخل الترجمة الإنجليزية...' : 'Enter English translation...'}
                        className={`flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-purple-500 transition ${isAr ? 'text-right' : 'text-left'}`}
                      />
                    </div>

                    {/* Field 3: Arabic (Inline RTL Tahoma) */}
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span className={`w-24 shrink-0 font-bold uppercase text-pink-400 text-[11px] ${isAr ? 'text-right font-tahoma-arabic' : 'text-left'}`}>
                        {isAr ? 'العربية:' : 'Arabic:'}
                      </span>
                      <input
                        type="text"
                        dir="rtl"
                        value={sub.arabicText || ''}
                        onChange={(e) => handleArabicChange(sub.id, e.target.value)}
                        placeholder="أدخل الترجمة العربية..."
                        className="flex-1 font-tahoma-arabic bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-pink-500 transition text-right"
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
              <h3 className="text-xl font-bold text-white">
                {isAr ? 'تأكيد حذف المشروع' : 'Confirm Project Deletion'}
              </h3>
              <p className="text-xs text-rose-300 mt-2 leading-relaxed">
                {isAr
                  ? 'سيتم حذف جميع ملفات هذا المشروع نهائياً (الفيديو والصوت وملف الترجمة). هل تريد المتابعة؟'
                  : 'All associated media files (video, audio track, and SRT subtitles) will be permanently deleted. Proceed with deletion?'}
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 bg-slate-900 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDeleteProject}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg flex items-center justify-center space-x-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? (isAr ? 'جاري الحذف...' : 'Deleting...') : (isAr ? 'حذف الآن' : 'Delete Project')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md glass-panel-glow rounded-3xl p-6 text-slate-100 shadow-2xl border border-purple-500/30 space-y-6">
            <button
              onClick={() => setShowExportModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-900 p-2 rounded-full border border-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-xl font-bold text-white">{isAr ? 'تصدير ملف الترجمة' : 'Export Subtitle File'}</h3>
              <p className="text-xs text-slate-400 mt-1">{isAr ? 'اختر التنسيق واللغة للتصدير' : 'Select export format and target language.'}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Format</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExportFormat('srt')}
                    className={`py-2.5 rounded-xl border text-xs font-bold transition ${
                      exportFormat === 'srt' ? 'bg-purple-600 text-white border-purple-400' : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    .SRT (SubRip)
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFormat('ass')}
                    className={`py-2.5 rounded-xl border text-xs font-bold transition ${
                      exportFormat === 'ass' ? 'bg-purple-600 text-white border-purple-400' : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    .ASS (Advanced SubStation)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Language</label>
                <select
                  value={exportLang}
                  onChange={(e) => setExportLang(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                >
                  <option value="ar">Arabic (العربية)</option>
                  <option value="en">English</option>
                  <option value="ja">Japanese (Original ASR)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleTriggerExport}
                className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-xs font-bold text-white shadow-lg"
              >
                <Download className="w-4 h-4" />
                <span>Export & Download</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
