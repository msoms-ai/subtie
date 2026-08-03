import React, { useState, useEffect } from 'react';
import { Search, Film, Upload, Sparkles, ArrowRight, ArrowLeft, CheckCircle2, Loader2, FileVideo } from 'lucide-react';

export default function LoadVideoWizard({ onCompleteProcess, onCancel }) {
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [animeName, setAnimeName] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [season, setSeason] = useState('1');
  const [episodeNum, setEpisodeNum] = useState('1');
  const [episodeTitle, setEpisodeTitle] = useState('');

  const [videoFile, setVideoFile] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);

  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  // Anime Search Autocomplete effect
  useEffect(() => {
    if (!animeName.trim() || animeName.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/anime-search?q=${encodeURIComponent(animeName)}`);
        const data = await res.json();
        setSuggestions(data.results || []);
      } catch (err) {
        console.error('Anime search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [animeName]);

  // Video Upload Action
  const handleUploadVideo = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.mp4')) {
      alert('Please select a valid MP4 video file.');
      return;
    }

    setVideoFile(file);
    const formData = new FormData();
    formData.append('video', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setProjectId(data.projectId);
        setVideoUrl(data.videoUrl);
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Video upload failed:', err);
      alert('Video upload error. Please try again.');
    }
  };

  // Start AI Processing Pipeline
  const startAIProcessing = async () => {
    if (!projectId) {
      alert('Please upload a video first.');
      return;
    }

    setCurrentStep(4);
    setIsProcessing(true);
    setProgress(5);
    setStatusMessage('Creating unique project directory and saving video...');

    // Simulate progress stages
    const stages = [
      { pct: 25, msg: 'Extracting audio track from MP4 file...' },
      { pct: 50, msg: 'AI Transcribing Japanese speech & generating timestamps...' },
      { pct: 75, msg: 'AI Pre-translating Japanese lines to Arabic...' },
      { pct: 90, msg: 'Extracting key character profiles and visual avatars...' },
      { pct: 100, msg: 'Saving SRT subtitle file and building editor...' }
    ];

    let currentIdx = 0;
    const interval = setInterval(async () => {
      if (currentIdx < stages.length) {
        setProgress(stages[currentIdx].pct);
        setStatusMessage(stages[currentIdx].msg);
        currentIdx++;
      } else {
        clearInterval(interval);
        try {
          const res = await fetch('/api/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId,
              animeName: animeName || 'Anime Project',
              season,
              episodeNum,
              episodeTitle: episodeTitle || `Episode ${episodeNum}`
            })
          });
          const data = await res.json();
          if (data.success) {
            setTimeout(() => {
              setIsProcessing(false);
              onCompleteProcess(data.project);
            }, 600);
          }
        } catch (err) {
          console.error('AI Processing error:', err);
          alert('Processing error occurred.');
        }
      }
    }, 1200);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      
      {/* Wizard Header & Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onCancel}
            className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
          <span className="text-xs font-bold text-purple-400 uppercase tracking-widest bg-purple-950/60 px-3 py-1 rounded-full border border-purple-500/20">
            Step {currentStep} of 4
          </span>
        </div>

        {/* Step Indicators */}
        <div className="grid grid-cols-4 gap-2">
          {['Anime Title', 'Episode Info', 'Upload MP4', 'AI Processing'].map((label, idx) => {
            const stepNum = idx + 1;
            const isActive = currentStep === stepNum;
            const isDone = currentStep > stepNum;
            return (
              <div key={idx} className="flex flex-col items-center">
                <div
                  className={`w-full h-2 rounded-full transition-all ${
                    isDone ? 'bg-purple-500' : isActive ? 'bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse' : 'bg-slate-800'
                  }`}
                />
                <span className={`text-[11px] font-medium mt-2 hidden sm:inline ${isActive ? 'text-purple-300 font-semibold' : 'text-slate-500'}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1: Anime Name Autocomplete */}
      {currentStep === 1 && (
        <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 border border-purple-500/20 space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">Name the Anime</h3>
            <p className="text-xs text-slate-400">
              Type to search trusted anime titles from AniList database.
            </p>
          </div>

          <div className="relative">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-purple-400 absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={animeName}
                onChange={(e) => setAnimeName(e.target.value)}
                placeholder="e.g. One Piece, Attack on Titan..."
                className="w-full bg-slate-900/90 border border-slate-700 focus:border-purple-500 rounded-2xl pl-12 pr-10 py-4 text-base text-white outline-none transition shadow-inner"
              />
              {isSearching && <Loader2 className="w-5 h-5 text-purple-400 absolute right-4 animate-spin" />}
            </div>

            {/* Suggestions Dropdown */}
            {suggestions.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                {suggestions.map((title, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setAnimeName(title);
                      setSuggestions([]);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-purple-900/40 hover:text-white transition flex items-center space-x-2 border-b border-slate-800/50 last:border-0"
                  >
                    <Film className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>{title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <button
              disabled={!animeName.trim()}
              onClick={() => setCurrentStep(2)}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-sm transition shadow-lg shadow-purple-500/20"
            >
              <span>Next: Episode Details</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Season & Episode Details */}
      {currentStep === 2 && (
        <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 border border-purple-500/20 space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">Episode Information</h3>
            <p className="text-xs text-slate-400">
              Select season, episode number, and episode title for <span className="text-purple-300 font-semibold">{animeName}</span>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Season Number</label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-xl px-4 py-3 text-sm text-white outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => (
                  <option key={s} value={s}>Season {s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Episode Number</label>
              <input
                type="number"
                min="1"
                value={episodeNum}
                onChange={(e) => setEpisodeNum(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-xl px-4 py-3 text-sm text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Episode Title (Optional)</label>
            <input
              type="text"
              value={episodeTitle}
              onChange={(e) => setEpisodeTitle(e.target.value)}
              placeholder="e.g. The Dawn of Adventure"
              className="w-full bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-xl px-4 py-3 text-sm text-white outline-none"
            />
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-5 py-3 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-sm font-medium transition"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition shadow-lg shadow-purple-500/20"
            >
              <span>Next: Upload Video</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Upload MP4 Video */}
      {currentStep === 3 && (
        <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 border border-purple-500/20 space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">Upload Video File</h3>
            <p className="text-xs text-slate-400">
              Upload the video file in <span className="text-pink-400 font-semibold">.mp4</span> format. It will be stored in a unique server directory.
            </p>
          </div>

          <div className="border-2 border-dashed border-purple-500/40 hover:border-purple-400 bg-purple-950/20 rounded-3xl p-8 flex flex-col items-center justify-center text-center transition">
            <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4">
              <Upload className="w-8 h-8 animate-pulse" />
            </div>
            
            {videoFile ? (
              <div className="flex items-center space-x-3 bg-slate-900 px-4 py-3 rounded-2xl border border-slate-700">
                <FileVideo className="w-6 h-6 text-pink-400" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">{videoFile.name}</p>
                  <p className="text-xs text-slate-400">{(videoFile.size / (1024 * 1024)).toFixed(1)} MB • Unique Folder Saved</p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-400 ml-2" />
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold text-slate-200">Drag & drop your MP4 anime episode file here</p>
                <p className="text-xs text-slate-400 mt-1">or click to browse your computer</p>
                <input
                  type="file"
                  accept="video/mp4"
                  onChange={(e) => e.target.files?.[0] && handleUploadVideo(e.target.files[0])}
                  className="mt-4 cursor-pointer file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 text-xs text-slate-400"
                />
              </>
            )}
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-5 py-3 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-sm font-medium transition"
            >
              Back
            </button>
            <button
              disabled={!projectId}
              onClick={startAIProcessing}
              className="flex items-center space-x-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 disabled:opacity-50 text-white font-bold text-sm transition shadow-lg shadow-purple-500/30"
            >
              <Sparkles className="w-4 h-4 text-pink-200" />
              <span>Start AI Processing</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: AI Processing Progress Screen */}
      {currentStep === 4 && (
        <div className="glass-panel-glow rounded-3xl p-8 sm:p-12 border border-purple-500/30 text-center space-y-8">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-purple-600 to-pink-500 p-0.5 shadow-xl shadow-purple-500/30 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-purple-400 animate-spin" />
            </div>
          </div>

          <div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
              Processing Video with AI
            </h3>
            <p className="text-sm text-purple-300/80 max-w-md mx-auto">
              Extracting audio, transcribing Japanese voice, creating SRT timestamps, and generating Arabic AI pre-translations.
            </p>
          </div>

          {/* Interactive Progress Bar & Percentage */}
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-full h-4 bg-slate-900 rounded-full border border-slate-800 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full shimmer-bar transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-purple-400">{statusMessage}</span>
              <span className="text-white bg-purple-950 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                {progress}%
              </span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
