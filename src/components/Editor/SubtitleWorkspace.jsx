import React, { useState, useRef } from 'react';
import { Play, Pause, CheckCircle2, Circle, Save, Share2, Copy, Check, Film, Users, Sparkles, Volume2 } from 'lucide-react';

export default function SubtitleWorkspace({ initialProject, onSaveProject }) {
  const [project, setProject] = useState(initialProject);
  const [subtitles, setSubtitles] = useState(initialProject?.subtitles || []);
  const [characters, setCharacters] = useState(initialProject?.characters || []);
  const [activeSubId, setActiveSubId] = useState(null);

  const [isSaving, setIsSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const videoRef = useRef(null);

  // Jump Video to precise timestamp when clicking a subtitle line
  const handleSelectLine = (sub) => {
    setActiveSubId(sub.id);
    if (videoRef.current) {
      videoRef.current.currentTime = sub.startSeconds;
      videoRef.current.play();
    }
  };

  // Toggle Verification tick ("OK" vs "Needs Rephrase")
  const handleToggleVerified = (id) => {
    setSubtitles(prev =>
      prev.map(sub => sub.id === id ? { ...sub, verified: !sub.verified } : sub)
    );
  };

  // Update Arabic text translation in real-time
  const handleArabicTextChange = (id, newText) => {
    setSubtitles(prev =>
      prev.map(sub => sub.id === id ? { ...sub, arabicText: newText } : sub)
    );
  };

  // Save Progress & Copy Unique Share Link
  const handleSaveProgress = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/project/${project.id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtitles, characters })
      });
      const data = await res.json();
      if (data.success) {
        setProject(data.project);
        if (onSaveProject) onSaveProject(data.project);
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyShareLink = () => {
    const shareableUrl = `${window.location.origin}/?project=${project.id}`;
    navigator.clipboard.writeText(shareableUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const totalLines = subtitles.length;
  const verifiedCount = subtitles.filter(s => s.verified).length;
  const progressPercent = totalLines > 0 ? Math.round((verifiedCount / totalLines) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Bar: Title & Save/Share Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-5 rounded-3xl border border-purple-500/20">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-purple-400 bg-purple-950 px-2.5 py-1 rounded-full border border-purple-500/30 uppercase tracking-wider">
              {project.animeName}
            </span>
            <span className="text-xs text-slate-400">
              Season {project.season} • Episode {project.episodeNum}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
            {project.episodeTitle}
          </h2>
        </div>

        {/* Top Right Save & Share Button */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleCopyShareLink}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs sm:text-sm font-medium transition"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-purple-400" />
                <span>Share Project Link</span>
              </>
            )}
          </button>

          <button
            onClick={handleSaveProgress}
            disabled={isSaving}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white text-xs sm:text-sm font-bold shadow-lg shadow-purple-500/20 transition"
          >
            <Save className="w-4 h-4 text-pink-200" />
            <span>{isSaving ? 'Saving...' : 'Save Progress'}</span>
          </button>
        </div>
      </div>

      {/* TOP SECTION: Loaded Video Player */}
      <div className="glass-panel-glow rounded-3xl p-4 sm:p-6 border border-purple-500/30 overflow-hidden shadow-2xl">
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-inner">
          <video
            ref={videoRef}
            src={project.videoUrl}
            controls
            className="w-full h-full object-contain"
          />
        </div>

        {/* Translation Verification Progress Indicator */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-semibold px-2">
          <div className="flex items-center space-x-2 text-purple-300">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span>Translation Verification Progress</span>
          </div>
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div className="w-full sm:w-48 h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-slate-300">
              {verifiedCount}/{totalLines} lines ({progressPercent}%)
            </span>
          </div>
        </div>
      </div>

      {/* MIDDLE SECTION: Interactive Subtitle Translation Table */}
      <div className="glass-panel rounded-3xl p-4 sm:p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <Film className="w-5 h-5 text-purple-400" />
            <span>Interactive Subtitle Timeline & Translation</span>
          </h3>
          <span className="text-xs text-slate-400">
            Click any row to jump video & listen
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-800">
                <th className="py-3 px-3 w-28">Start - End</th>
                <th className="py-3 px-3">Japanese Transcript</th>
                <th className="py-3 px-3 text-right">Arabic Translation (RTL Tahoma)</th>
                <th className="py-3 px-3 w-24 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {subtitles.map((sub) => {
                const isActive = activeSubId === sub.id;
                return (
                  <tr
                    key={sub.id}
                    className={`transition-colors group ${
                      isActive ? 'bg-purple-950/40 border-l-4 border-purple-500' : 'hover:bg-slate-900/60'
                    }`}
                  >
                    {/* Start / End Timestamp (Clickable to jump video) */}
                    <td
                      onClick={() => handleSelectLine(sub)}
                      className="py-3 px-3 font-mono text-purple-300 cursor-pointer whitespace-nowrap"
                    >
                      <div className="flex items-center space-x-1.5 hover:text-pink-300">
                        <Volume2 className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110" />
                        <span>{sub.startTime.split(',')[0]}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 pl-5">
                        {sub.endTime.split(',')[0]}
                      </div>
                    </td>

                    {/* Japanese Transcript */}
                    <td
                      onClick={() => handleSelectLine(sub)}
                      className="py-3 px-3 font-medium text-slate-200 cursor-pointer"
                    >
                      {sub.japaneseText}
                    </td>

                    {/* Arabic Translation Input Field (RTL, Tahoma Font) */}
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        dir="rtl"
                        value={sub.arabicText}
                        onChange={(e) => handleArabicTextChange(sub.id, e.target.value)}
                        className="w-full font-tahoma-arabic bg-slate-900/90 border border-slate-800 focus:border-purple-500 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none transition shadow-inner"
                        placeholder="أدخل الترجمة العربية..."
                      />
                    </td>

                    {/* Verification Toggle Tick */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleToggleVerified(sub.id)}
                        className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                          sub.verified
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-950/50 text-amber-400 border border-amber-500/30 hover:bg-amber-900/60'
                        }`}
                      >
                        {sub.verified ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>OK</span>
                          </>
                        ) : (
                          <>
                            <Circle className="w-3.5 h-3.5 text-amber-400" />
                            <span>Verify</span>
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

      {/* BOTTOM SECTION: Extracted Anime Characters Gallery */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center space-x-2">
          <Users className="w-5 h-5 text-indigo-400" />
          <span>Extracted Episode Characters</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {characters.map((char) => (
            <div
              key={char.id}
              className="flex items-center space-x-4 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/30 transition shadow-md"
            >
              <img
                src={char.image}
                alt={char.name}
                className="w-14 h-14 rounded-2xl object-cover border border-purple-500/30 shrink-0"
              />
              <div className="overflow-hidden">
                <h4 className="text-sm font-bold text-white truncate">{char.name}</h4>
                <p className="text-xs text-purple-300/80 truncate mt-0.5">{char.title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
