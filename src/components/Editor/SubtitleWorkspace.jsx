import React, { useState, useRef } from 'react';
import { Save, Download, CheckCircle2, Circle, Volume2, Film, Layers, X, ArrowLeft, Languages } from 'lucide-react';

export default function SubtitleWorkspace({ initialProject, onSaveAndClose }) {
  const [project, setProject] = useState(initialProject);
  const [subtitles, setSubtitles] = useState(initialProject?.subtitles || []);
  const [activeSubId, setActiveSubId] = useState(null);

  // Modal / Action states
  const [isSaving, setIsSaving] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('srt'); // 'srt' or 'ass'
  const [exportLang, setExportLang] = useState('ar'); // 'ar', 'en', 'ja'

  const videoRef = useRef(null);

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

  // Export subtitle file as .srt or .ass in selected language and remain on page
  const handleTriggerExport = () => {
    const exportUrl = `/api/project/${project.id}/export?format=${exportFormat}&lang=${exportLang}`;
    window.location.href = exportUrl;
    setShowExportModal(false);
  };

  const totalLines = subtitles.length;
  const approvedCount = subtitles.filter(s => s.approved).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Header: Video Info on Right & Save / Export Buttons */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-panel p-5 rounded-3xl border border-purple-500/20">
        
        {/* Left Side: Back button */}
        <button
          onClick={onSaveAndClose}
          className="flex items-center space-x-2 text-xs text-slate-400 hover:text-white bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Workspace</span>
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

        {/* Top Right Action Buttons (Save & Export) */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs sm:text-sm font-semibold transition"
          >
            <Download className="w-4 h-4 text-purple-400" />
            <span>Export Subtitles (.SRT/.ASS)</span>
          </button>

          <button
            onClick={handleSaveAndClose}
            disabled={isSaving}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white text-xs sm:text-sm font-bold shadow-lg shadow-purple-500/20 transition"
          >
            <Save className="w-4 h-4 text-pink-200" />
            <span>{isSaving ? 'Saving...' : 'Save & Exit to Main Page'}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Loaded Video Player */}
        <div className="lg:col-span-5 glass-panel-glow rounded-3xl p-4 border border-purple-500/30 shadow-2xl sticky top-24">
          <div className="flex items-center justify-between mb-3 px-2">
            <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
              <Film className="w-4 h-4 text-purple-400" />
              <span>Loaded Media Player</span>
            </span>
            <span className="text-[11px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-500/30 font-semibold">
              {approvedCount}/{totalLines} Approved
            </span>
          </div>

          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-inner border border-slate-800">
            <video
              ref={videoRef}
              src={project.videoUrl}
              controls
              playsInline
              preload="metadata"
              className="w-full h-full object-contain"
            />
          </div>

          <p className="text-[11px] text-slate-400 text-center mt-3">
            Click any subtitle line timestamp to jump video to that moment
          </p>
        </div>

        {/* Right Side: Spacious Subtitle Card List */}
        <div className="lg:col-span-7 space-y-5">
          <div className="flex items-center justify-between glass-panel px-5 py-4 rounded-2xl border border-slate-800">
            <div className="flex items-center space-x-2">
              <Languages className="w-5 h-5 text-purple-400" />
              <h3 className="text-base font-bold text-white">
                Subtitle Translation Workspace
              </h3>
            </div>
            <span className="text-xs text-purple-300 font-medium">
              Full-width line editing layout
            </span>
          </div>

          {/* Subtitle Line Cards */}
          <div className="space-y-4">
            {subtitles.map((sub, idx) => {
              const isActive = activeSubId === sub.id;
              return (
                <div
                  key={sub.id}
                  className={`glass-panel p-5 rounded-3xl border transition shadow-md space-y-3.5 ${
                    isActive
                      ? 'border-purple-500 bg-purple-950/30 shadow-purple-500/20'
                      : 'border-slate-800 hover:border-purple-500/30'
                  }`}
                >
                  {/* Card Header: Timestamp Badge & Human Check Approved Button */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleSelectLine(sub)}
                      className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/30 text-purple-300 font-mono text-xs transition"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-pink-400" />
                      <span className="font-semibold">Line #{idx + 1}</span>
                      <span className="text-slate-400">|</span>
                      <span>{sub.startTime.split(',')[0]} → {sub.endTime.split(',')[0]}</span>
                    </button>

                    {/* Human Check Approved Button */}
                    <button
                      onClick={() => handleToggleApproved(sub.id)}
                      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                        sub.approved
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 shadow-sm'
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                      }`}
                    >
                      {sub.approved ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Approved</span>
                        </>
                      ) : (
                        <>
                          <Circle className="w-4 h-4 text-slate-500" />
                          <span>Human Check</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Japanese Line on Full Width */}
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-1">
                      Original Spoken Japanese (ASR)
                    </span>
                    <div className="w-full bg-slate-950/90 border border-purple-500/30 rounded-2xl px-4 py-3 text-sm font-semibold text-purple-200 tracking-wide shadow-inner">
                      {sub.japaneseText}
                    </div>
                  </div>

                  {/* Two Full Width Editing Fields: English & Arabic */}
                  <div className="space-y-3 pt-1">
                    
                    {/* Full-Width English Field */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        English Translation (AI / Manual Edit)
                      </label>
                      <input
                        type="text"
                        value={sub.englishText || ''}
                        onChange={(e) => handleEnglishChange(sub.id, e.target.value)}
                        placeholder="Enter full English translation..."
                        className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-2xl px-4 py-3 text-sm text-slate-100 outline-none transition shadow-inner font-normal"
                      />
                    </div>

                    {/* Full-Width Arabic Field (RTL Tahoma) */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-pink-400 mb-1">
                        الترجمة العربية (Arabic Translation - RTL Tahoma)
                      </label>
                      <input
                        type="text"
                        dir="rtl"
                        value={sub.arabicText || ''}
                        onChange={(e) => handleArabicChange(sub.id, e.target.value)}
                        placeholder="أدخل الترجمة العربية الكاملة..."
                        className="w-full font-tahoma-arabic bg-slate-950 border border-slate-800 focus:border-pink-500 rounded-2xl px-4 py-3 text-sm text-slate-100 outline-none transition shadow-inner font-normal"
                      />
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Export Subtitle Modal */}
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
              <h3 className="text-xl font-bold text-white">Export Subtitle File</h3>
              <p className="text-xs text-slate-400 mt-1">
                Select export format and target language.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Subtitle Format</label>
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
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Target Language</label>
                <select
                  value={exportLang}
                  onChange={(e) => setExportLang(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
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
