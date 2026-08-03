import React from 'react';
import { X, Info, Sparkles, Heart } from 'lucide-react';

export default function AboutModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl glass-panel-glow rounded-3xl p-6 sm:p-8 text-slate-100 shadow-2xl border border-purple-500/30">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white bg-slate-900/60 p-2 rounded-full border border-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">About Subtie Project</h3>
            <p className="text-xs text-purple-300/80">Empowering Anime Fan Translators Worldwide</p>
          </div>
        </div>

        {/* Content Body */}
        <div className="space-y-4 text-sm text-slate-300 leading-relaxed font-normal">
          <p>
            <strong className="text-purple-300">Subtie</strong> was born out of a deep passion for the global Anime fansubbing community. For decades, dedicated fan translators painstakingly transcribed audio line-by-line, timestamped dialogues manually, and coordinated translations across separate tools.
          </p>
          <p>
            Subtie revolutionizes this workflow by combining cutting-edge AI speech transcription, automated initial Arabic translations, and timestamp alignment with an interactive, collaborative workspace tailored for Arabic typography and fansub standards.
          </p>

          <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/20 flex items-start space-x-3 mt-4">
            <Sparkles className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <p className="text-xs text-purple-200/90">
              Our mission is to assist fansubbers in delivering high-quality, authentic translations faster than ever while preserving full human creative control over phrasing and nuance.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-8 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium text-sm hover:opacity-90 transition shadow-lg shadow-purple-500/25"
          >
            Got it
          </button>
        </div>

      </div>
    </div>
  );
}
