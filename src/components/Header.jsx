import React from 'react';
import { Sparkles, Film, Wand2 } from 'lucide-react';

export default function Header({ onGoHome }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-purple-500/10 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Left Branding / Subtitle Tag */}
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

        {/* Right Action */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onGoHome}
            className="flex items-center space-x-2 text-xs sm:text-sm font-medium text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/30 px-3.5 py-2 rounded-xl transition-all shadow-sm"
          >
            <Wand2 className="w-4 h-4 text-purple-400" />
            <span className="hidden sm:inline">New Project</span>
          </button>
        </div>

      </div>
    </header>
  );
}
