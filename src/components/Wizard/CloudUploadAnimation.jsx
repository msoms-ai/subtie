import React from 'react';
import { CloudUpload, FileVideo, Sparkles } from 'lucide-react';

export default function CloudUploadAnimation() {
  return (
    <div className="relative w-full max-w-sm mx-auto h-48 flex items-center justify-center overflow-hidden my-4">
      {/* Background Cloud Glow */}
      <div className="absolute inset-0 bg-purple-500/10 rounded-full blur-3xl" />

      {/* Floating Cloud */}
      <div className="relative z-10 animate-cloud-float flex flex-col items-center">
        <div className="relative">
          <CloudUpload className="w-28 h-28 text-purple-400 drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]" />
          <Sparkles className="absolute -top-1 -right-1 w-6 h-6 text-pink-400 animate-pulse" />
        </div>
      </div>

      {/* Rising Video File Particles */}
      <div className="absolute bottom-2 animate-upload-file flex items-center space-x-1.5 bg-slate-900/90 text-purple-300 border border-purple-500/40 px-3 py-1.5 rounded-2xl shadow-xl">
        <FileVideo className="w-4 h-4 text-pink-400" />
        <span className="text-xs font-semibold">video.mp4</span>
      </div>

      {/* Second Staggered Particle */}
      <div
        className="absolute bottom-2 animate-upload-file flex items-center space-x-1 bg-purple-950/90 text-pink-300 border border-pink-500/40 px-2.5 py-1 rounded-2xl shadow-lg"
        style={{ animationDelay: '1.1s' }}
      >
        <Sparkles className="w-3.5 h-3.5 text-purple-300" />
        <span className="text-[10px] font-bold">Uploading to Cloud...</span>
      </div>
    </div>
  );
}
