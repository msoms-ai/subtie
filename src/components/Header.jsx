import React, { useState, useEffect } from 'react';
import { Sparkles, Film, Key, Check, X } from 'lucide-react';

export default function Header({ onGoHome }) {
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('SUBTIE_GEMINI_API_KEY') || '';
    setApiKey(stored);
  }, []);

  const handleSaveKey = (e) => {
    e.preventDefault();
    localStorage.setItem('SUBTIE_GEMINI_API_KEY', apiKey.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setShowKeyModal(false);
    }, 1200);
  };

  const hasKey = Boolean(apiKey.trim());

  return (
    <header className="sticky top-0 z-40 w-full border-b border-purple-500/10 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Left Branding */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={onGoHome}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Film className="w-5 h-5 text-white" />
          </div>
          <span className="hidden sm:inline-block text-xs font-semibold uppercase tracking-wider text-purple-300/70 bg-purple-950/50 px-2.5 py-1 rounded-full border border-purple-500/20">
            Anime Fansub Hub
          </span>
        </div>

        {/* Center Glittering Title */}
        <div className="relative cursor-pointer group" onClick={onGoHome}>
          <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 rounded-lg blur-lg opacity-25 group-hover:opacity-60 transition duration-500"></div>
          <div className="relative flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight glitter-title font-['Outfit']">
              Subtie
            </h1>
            <Sparkles className="w-5 h-5 text-pink-400 animate-pulse" />
          </div>
        </div>

        {/* Right Actions: API Key Settings Button */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowKeyModal(true)}
            className={`flex items-center space-x-2 text-xs sm:text-sm font-medium px-3.5 py-2 rounded-xl transition border shadow-sm ${
              hasKey
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/80'
                : 'bg-amber-950/80 text-amber-300 border-amber-500/40 hover:bg-amber-900/80 animate-pulse'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>{hasKey ? 'Gemini API Key Connected' : 'Set Gemini API Key'}</span>
          </button>
        </div>

      </div>

      {/* Gemini API Key Configuration Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md glass-panel-glow rounded-3xl p-6 text-slate-100 shadow-2xl border border-purple-500/30 space-y-5">
            <button
              onClick={() => setShowKeyModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-900 p-2 rounded-full border border-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Gemini API Key</h3>
                <p className="text-xs text-purple-300/80">Required for real video AI transcription & translation</p>
              </div>
            </div>

            <form onSubmit={handleSaveKey} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Your Gemini API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  Get your key free at{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-400 underline hover:text-pink-300"
                  >
                    Google AI Studio
                  </a>. Key is saved locally in your browser.
                </p>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-xs font-bold text-white shadow-lg"
                >
                  {saved ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <span>Save Key</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </header>
  );
}
