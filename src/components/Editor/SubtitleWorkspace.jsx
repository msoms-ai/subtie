import React, { useState, useRef } from 'react';
import { Save, Download, CheckCircle2, Circle, Volume2, Film, Layers, Check, X, ArrowLeft } from 'lucide-react';

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
        
        {/* Left Side: Uploaded Video Player */}
        <div className="lg:col-span-5 glass-panel-glow rounded-3xl p-4 border border-purple-500/30 shadow-2xl sticky top-24">
          <div className="flex items-center justify-between mb-3 px-2">
            <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
              <Film className="w-4 h-4 text-purple-400" />
              <span>Loaded Media Player</span>
            </span>
            <span className="text-[11px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-500/30">
              {approvedCount}/{totalLines} Approved
            </span>
          </div>

          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-inner border border-slate-800">
            <video
              ref={videoRef}
              src={project.videoUrl}
              controls
              className="w-full h-full object-contain"
            />
          </div>

          <p className="text-[11px] text-slate-400 text-center mt-3">
            Click any row in the table to jump to that timestamp
          </p>
        </div>

        {/* Remaining Space: Subtitle Working Table */}
        <div className="lg:col-span-7 glass-panel rounded-3xl p-4 sm:p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white">
              Working Table Page (Subtitles)
            </h3>
            <span className="text-xs text-purple-300 font-medium">
              Japanese ASR $\rightarrow$ English AI $\rightarrow$ Arabic RTL
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <th className="py-2.5 px-2 w-24">Time</th>
                  <th className="py-2.5 px-2">Japanese</th>
                  <th className="py-2.5 px-2">English AI</th>
                  <th className="py-2.5 px-2 text-right">Arabic (RTL Tahoma)</th>
                  <th className="py-2.5 px-2 text-center w-20">Human Check</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {subtitles.map((sub) => {
                  const isActive = activeSubId === sub.id;
                  return (
                    <tr
                      key={sub.id}
                      className={`transition-colors ${
                        isActive ? 'bg-purple-950/50 border-l-4 border-purple-500' : 'hover:bg-slate-900/60'
                      }`}
                    >
                      {/* Start / End Timestamp */}
                      <td
                        onClick={() => handleSelectLine(sub)}
                        className="py-3 px-2 font-mono text-purple-300 cursor-pointer whitespace-nowrap"
                      >
                        <div className="flex items-center space-x-1 hover:text-pink-300">
                          <Volume2 className="w-3 h-3 text-purple-400" />
                          <span className="text-[11px]">{sub.startTime.split(',')[0]}</span>
                        </div>
                        <div className="text-[9px] text-slate-500 pl-4">
                          {sub.endTime.split(',')[0]}
                        </div>
                      </td>

                      {/* Transcribed Japanese */}
                      <td
                        onClick={() => handleSelectLine(sub)}
                        className="py-3 px-2 font-medium text-slate-200 text-xs cursor-pointer"
                      >
                        {sub.japaneseText}
                      </td>

                      {/* English Translation */}
                      <td className="py-3 px-2">
                        <input
                          type="text"
                          value={sub.englishText || ''}
                          onChange={(e) => handleEnglishChange(sub.id, e.target.value)}
                          className="w-full bg-slate-900/90 border border-slate-800 focus:border-purple-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none"
                        />
                      </td>

                      {/* Arabic Translation (RTL Tahoma) */}
                      <td className="py-3 px-2">
                        <input
                          type="text"
                          dir="rtl"
                          value={sub.arabicText || ''}
                          onChange={(e) => handleArabicChange(sub.id, e.target.value)}
                          className="w-full font-tahoma-arabic bg-slate-900/90 border border-slate-800 focus:border-purple-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none"
                        />
                      </td>

                      {/* Human Check Approved Tick Button */}
                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={() => handleToggleApproved(sub.id)}
                          className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-[11px] font-semibold transition ${
                            sub.approved
                              ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/40'
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
                              <span>Check</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
