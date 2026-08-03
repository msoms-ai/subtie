import React, { useState } from 'react';
import { ArrowRight, Disc, Play, Sparkles, Wand2, Layers, Cpu, Users } from 'lucide-react';

export default function LandingHero({ onStartWizard }) {
  const [activeMedia, setActiveMedia] = useState('dvd'); // 'dvd', 'vhs', 'vcd'

  return (
    <section className="relative min-h-[calc(100vh-160px)] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      
      {/* Background Ambient Neon Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-pink-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Subtitle Badge */}
      <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs sm:text-sm font-medium mb-8 shadow-inner shadow-purple-500/20">
        <Sparkles className="w-4 h-4 text-pink-400" />
        <span>Next-Gen Collaborative Anime Fansubbing</span>
      </div>

      {/* Hero Headline */}
      <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-center text-white max-w-4xl leading-tight tracking-tight mb-4">
        Collaborative Subtitle Translation for <span className="glitter-title">Anime Fansubbers</span>
      </h2>
      <p className="text-slate-400 text-sm sm:text-base text-center max-w-2xl mb-10 leading-relaxed font-normal">
        From Japanese speech transcription to accurate Arabic AI pre-translation & timing alignment — bring your team together in a unified workspace.
      </p>

      {/* Media Type Switcher */}
      <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl mb-8 text-xs font-medium">
        <button
          onClick={() => setActiveMedia('dvd')}
          className={`px-3.5 py-1.5 rounded-xl transition ${activeMedia === 'dvd' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
        >
          DVD Disc
        </button>
        <button
          onClick={() => setActiveMedia('vhs')}
          className={`px-3.5 py-1.5 rounded-xl transition ${activeMedia === 'vhs' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
        >
          VHS Tape
        </button>
        <button
          onClick={() => setActiveMedia('vcd')}
          className={`px-3.5 py-1.5 rounded-xl transition ${activeMedia === 'vcd' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
        >
          Video CD
        </button>
      </div>

      {/* Center Floating Vintage Media Asset with Interactive Hover Movement */}
      <div className="floating-disc-container my-4 cursor-pointer" onClick={onStartWizard}>
        <div className="floating-disc relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
          
          {activeMedia === 'dvd' && (
            <div className="relative w-full h-full rounded-full bg-gradient-to-tr from-slate-950 via-purple-950 to-slate-900 p-3 shadow-2xl border-4 border-purple-500/40 flex items-center justify-center group overflow-hidden">
              {/* DVD Holographic Prism Reflection */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-pink-500/20 to-purple-500/30 rounded-full opacity-60 group-hover:rotate-180 transition-transform duration-1000"></div>
              
              {/* Disc Center Hole & Grooves */}
              <div className="relative w-full h-full rounded-full border border-purple-400/20 flex items-center justify-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-950 border-4 border-purple-500/50 flex items-center justify-center shadow-inner">
                  <div className="w-8 h-8 rounded-full bg-purple-900/60 border border-pink-400/50 flex items-center justify-center">
                    <Disc className="w-4 h-4 text-purple-300 animate-spin" />
                  </div>
                </div>
              </div>

              {/* Artwork Label Overlay */}
              <div className="absolute bottom-10 text-center pointer-events-none">
                <span className="text-[10px] font-bold tracking-widest text-purple-300 uppercase bg-slate-950/80 px-3 py-1 rounded-full border border-purple-500/30">
                  SUBTIE DVD • ANIME MASTER
                </span>
              </div>
            </div>
          )}

          {activeMedia === 'vhs' && (
            <div className="relative w-72 h-44 sm:w-88 sm:h-52 bg-slate-900 rounded-2xl p-4 shadow-2xl border-2 border-slate-700/80 flex flex-col justify-between group overflow-hidden">
              <div className="flex justify-between items-center bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                <div className="w-12 h-6 bg-amber-500/20 border border-amber-500/40 rounded flex items-center justify-center text-[10px] font-bold text-amber-300">
                  VHS E-180
                </div>
                <span className="text-[11px] font-bold text-slate-300 tracking-wider">SUBTIE FANSUB VOL.1</span>
              </div>

              {/* Tape Reels Viewport */}
              <div className="w-full h-20 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-around px-6">
                <div className="w-12 h-12 rounded-full border-2 border-slate-700 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-slate-800 animate-spin"></div>
                </div>
                <div className="w-16 h-2 bg-amber-900/50 rounded-full"></div>
                <div className="w-12 h-12 rounded-full border-2 border-slate-700 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-slate-800 animate-spin"></div>
                </div>
              </div>

              <div className="flex justify-between items-center text-[9px] text-slate-500 uppercase tracking-widest">
                <span>Hi-Fi Stereo</span>
                <span>NTSC Standard</span>
              </div>
            </div>
          )}

          {activeMedia === 'vcd' && (
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-gradient-to-bl from-slate-900 via-indigo-950 to-slate-950 p-3 shadow-2xl border-4 border-indigo-500/40 flex items-center justify-center group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 via-transparent to-pink-500/20 rounded-full opacity-70"></div>
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-950 border-4 border-cyan-500/50 flex items-center justify-center">
                <Disc className="w-5 h-5 text-cyan-300" />
              </div>
              <div className="absolute bottom-12 text-center">
                <span className="text-[10px] font-bold tracking-widest text-cyan-300 uppercase bg-slate-950/80 px-3 py-1 rounded-full border border-cyan-500/30">
                  VIDEO CD • FANSUB EDITION
                </span>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Exciting Primary CTA Button: "Subtie your video" */}
      <div className="mt-8">
        <button
          onClick={onStartWizard}
          className="group relative inline-flex items-center space-x-3 px-8 py-4 sm:px-10 sm:py-5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white font-bold text-lg sm:text-xl shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300 border border-white/20"
        >
          <Wand2 className="w-6 h-6 text-pink-200 group-hover:rotate-45 transition-transform duration-300" />
          <span>Subtie your video</span>
          <ArrowRight className="w-6 h-6 text-white group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl w-full mt-16 text-center">
        <div className="p-4 rounded-2xl glass-panel border border-slate-800">
          <Cpu className="w-6 h-6 text-purple-400 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-200">AI Japanese Speech ASR</h4>
          <p className="text-xs text-slate-400 mt-1">Automatic timestamp alignment & speech-to-text</p>
        </div>
        <div className="p-4 rounded-2xl glass-panel border border-slate-800">
          <Layers className="w-6 h-6 text-pink-400 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-200">Arabic Translation Assist</h4>
          <p className="text-xs text-slate-400 mt-1">RTL Tahoma editor with line verification status</p>
        </div>
        <div className="p-4 rounded-2xl glass-panel border border-slate-800">
          <Users className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-200">Collaborative Link Sharing</h4>
          <p className="text-xs text-slate-400 mt-1">Generate unique link to resume or edit with peers</p>
        </div>
      </div>

    </section>
  );
}
