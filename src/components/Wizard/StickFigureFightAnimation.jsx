import React from 'react';

export default function StickFigureFightAnimation() {
  return (
    <div className="relative w-full h-32 flex items-center justify-center overflow-hidden my-4 bg-slate-950/60 rounded-2xl border border-purple-500/20 shadow-inner">
      <svg className="w-80 h-28" viewBox="0 0 300 100" fill="none">
        
        {/* Floor Line */}
        <line x1="20" y1="85" x2="280" y2="85" stroke="#475569" strokeWidth="2" strokeDasharray="4 4" />

        {/* LEFT FIGHTER (PURPLE HERO) */}
        <g className="animate-stick-left">
          {/* Head */}
          <circle cx="100" cy="35" r="10" stroke="#a855f7" strokeWidth="3.5" fill="#090d16" />
          {/* Body */}
          <line x1="100" y1="45" x2="100" y2="65" stroke="#a855f7" strokeWidth="3.5" strokeLinecap="round" />
          {/* Punching Arm */}
          <line x1="100" y1="50" x2="125" y2="48" stroke="#a855f7" strokeWidth="3.5" strokeLinecap="round" className="animate-punch-left" />
          {/* Guard Arm */}
          <line x1="100" y1="50" x2="90" y2="58" stroke="#a855f7" strokeWidth="3.5" strokeLinecap="round" />
          {/* Legs */}
          <line x1="100" y1="65" x2="88" y2="85" stroke="#a855f7" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="100" y1="65" x2="112" y2="85" stroke="#a855f7" strokeWidth="3.5" strokeLinecap="round" />
        </g>

        {/* RIGHT FIGHTER (PINK RIVAL) */}
        <g className="animate-stick-right">
          {/* Head */}
          <circle cx="200" cy="35" r="10" stroke="#ec4899" strokeWidth="3.5" fill="#090d16" />
          {/* Body */}
          <line x1="200" y1="45" x2="200" y2="65" stroke="#ec4899" strokeWidth="3.5" strokeLinecap="round" />
          {/* Kicking Leg */}
          <line x1="200" y1="65" x2="165" y2="50" stroke="#ec4899" strokeWidth="3.5" strokeLinecap="round" className="animate-kick-right" />
          {/* Stance Leg */}
          <line x1="200" y1="65" x2="212" y2="85" stroke="#ec4899" strokeWidth="3.5" strokeLinecap="round" />
          {/* Guard Arms */}
          <line x1="200" y1="50" x2="185" y2="45" stroke="#ec4899" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="200" y1="50" x2="215" y2="55" stroke="#ec4899" strokeWidth="3.5" strokeLinecap="round" />
        </g>

        {/* IMPACT SPARK CLASH */}
        <path d="M 140 45 L 145 40 L 143 48 L 150 45 L 145 52 L 152 55 L 143 55 Z" fill="#f472b6" className="animate-spark" />

      </svg>
    </div>
  );
}
