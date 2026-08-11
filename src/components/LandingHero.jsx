import React, { useState, useEffect } from 'react';
import { ArrowRight, Disc, Sparkles, Wand2, Layers, Cpu, Users } from 'lucide-react';

export default function LandingHero({ onStartWizard }) {
  const mediaTypes = [
    { id: 'dvd', label: 'DVD Disc' },
    { id: 'vhs', label: 'VHS Tape' },
    { id: 'vcd', label: 'Video CD' }
  ];

  const [activeIndex, setActiveIndex] = useState(0);

  // Automatic continuous rotation between vintage media items
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % mediaTypes.length);
    }, 3800);

    return () => clearInterval(timer);
  }, []);

  const activeMedia = mediaTypes[activeIndex].id;

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
      <p className="text-slate-400 text-sm sm:text-base text-center max-w-2xl mb-8 leading-relaxed font-normal">
        From Japanese speech transcription to accurate Arabic AI pre-translation & timing alignment — bring your team together in a unified workspace.
      </p>

      {/* Center Floating Vintage Media Asset (Automatic Continuous Rotation, Hover Glowing Highlight, No Outer Rectangle Box) */}
      <div className="floating-media-container my-6 cursor-pointer" onClick={onStartWizard}>
        <div className="floating-media relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
          
          {/* 1. DVD DISC MEDIA (Pure Circular Geometry) */}
          {activeMedia === 'dvd' && (
            <div className="media-glow-dvd relative w-60 h-60 sm:w-72 sm:h-72 rounded-full bg-gradient-to-tr from-slate-950 via-purple-950 to-slate-900 p-3 flex items-center justify-center group transition-all duration-500">
              
              {/* Top Specular Glowing Highlight Sheen on Hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-pink-500/20 to-transparent rounded-full opacity-30 group-hover:opacity-90 group-hover:rotate-180 transition-all duration-700 pointer-events-none"></div>

              {/* Disc Grooves & Mirror Tracks */}
              <div className="relative w-full h-full rounded-full border border-purple-400/30 flex items-center justify-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-950 border-4 border-purple-500/60 flex items-center justify-center shadow-inner">
                  <div className="w-8 h-8 rounded-full bg-purple-900/80 border border-pink-400/60 flex items-center justify-center">
                    <Disc className="w-4 h-4 text-purple-300 animate-spin" />
                  </div>
                </div>
              </div>

              {/* Holographic Text Label */}
              <div className="absolute bottom-9 text-center pointer-events-none">
                <span className="text-[10px] font-bold tracking-widest text-purple-200 uppercase bg-purple-950/90 px-3 py-1 rounded-full border border-purple-400/40 shadow-lg">
                  SUBTIE DVD • ANIME MASTER
                </span>
              </div>
            </div>
          )}

          {/* 2. VHS TAPE CASSETTE MEDIA (Pure Rounded Cassette Silhouette, No Box) */}
          {activeMedia === 'vhs' && (
            <div className="media-glow-vhs relative w-72 h-44 sm:w-84 sm:h-52 bg-slate-950 rounded-3xl p-4 flex flex-col justify-between group border border-slate-700/60 transition-all duration-500">
              
              {/* Top Specular Glowing Highlight Sheen on Hover */}
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 via-white/20 to-transparent rounded-3xl opacity-20 group-hover:opacity-80 transition-all duration-700 pointer-events-none"></div>

              {/* VHS Cassette Header Label */}
              <div className="flex justify-between items-center bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                <div className="w-12 h-5 bg-amber-500/30 border border-amber-400/50 rounded flex items-center justify-center text-[10px] font-extrabold text-amber-300">
                  VHS E-180
                </div>
                <span className="text-[11px] font-bold text-slate-200 tracking-wider">SUBTIE FANSUB VOL.1</span>
              </div>

              {/* Tape Reels Viewport */}
              <div className="w-full h-20 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center justify-around px-6">
                <div className="w-12 h-12 rounded-full border-2 border-amber-500/40 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 animate-spin"></div>
                </div>
                <div className="w-16 h-2 bg-amber-950 rounded-full border border-amber-500/30"></div>
                <div className="w-12 h-12 rounded-full border-2 border-amber-500/40 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 animate-spin"></div>
                </div>
              </div>

              <div className="flex justify-between items-center text-[9px] font-semibold text-slate-400 uppercase tracking-widest px-1">
                <span>Hi-Fi Stereo</span>
                <span>NTSC Standard</span>
              </div>
            </div>
          )}

          {/* 3. VIDEO CD MEDIA (Pure Circular Geometry) */}
          {activeMedia === 'vcd' && (
            <div className="media-glow-vcd relative w-60 h-60 sm:w-72 sm:h-72 rounded-full bg-gradient-to-bl from-slate-950 via-indigo-950 to-cyan-950 p-3 flex items-center justify-center group transition-all duration-500">
              
              {/* Top Specular Glowing Highlight Sheen on Hover */}
              <div className="absolute inset-0 bg-gradient-to-tl from-cyan-400/30 via-white/20 to-transparent rounded-full opacity-30 group-hover:opacity-90 group-hover:rotate-180 transition-all duration-700 pointer-events-none"></div>

              {/* Center Ring */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-950 border-4 border-cyan-500/60 flex items-center justify-center shadow-inner">
                <Disc className="w-5 h-5 text-cyan-300 animate-spin" />
              </div>

              <div className="absolute bottom-9 text-center pointer-events-none">
                <span className="text-[10px] font-bold tracking-widest text-cyan-200 uppercase bg-cyan-950/90 px-3 py-1 rounded-full border border-cyan-400/40 shadow-lg">
                  VIDEO CD • FANSUB EDITION
                </span>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Rotating Media Status Indicator Dots */}
      <div className="flex items-center space-x-2.5 mb-6">
        {mediaTypes.map((item, idx) => (
          <button
            key={item.id}
            onClick={() => setActiveIndex(idx)}
            className={`transition-all duration-300 rounded-full ${
              activeIndex === idx
                ? 'w-7 h-2.5 bg-gradient-to-r from-purple-500 to-pink-500 shadow-md shadow-purple-500/50'
                : 'w-2.5 h-2.5 bg-slate-800 hover:bg-slate-700'
            }`}
            title={item.label}
          />
        ))}
      </div>

      {/* Exciting Primary CTA Button: "Subtie your video" */}
      <div>
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
