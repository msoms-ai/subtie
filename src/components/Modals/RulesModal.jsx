import React from 'react';
import { X, ShieldAlert, Check } from 'lucide-react';

export default function RulesModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const rules = [
    {
      title: 'No Illegal or Sexual Content',
      description: 'Translators must refrain from uploading or generating subtitles for illegal, sexually explicit (hentai/nsfw), or abusive video content.'
    },
    {
      title: 'Respect Fansub Attribution',
      description: 'Acknowledge original audio creators, voice actors, and fellow translation collaborators.'
    },
    {
      title: 'Quality & Accuracy First',
      description: 'Ensure accurate translation phrasing into Arabic, respecting original context and character tone.'
    },
    {
      title: 'Anti-Abuse & Data Safety',
      description: 'Do not use automated scripts or bots to spam the AI processing backend.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg glass-panel-glow rounded-3xl p-6 sm:p-8 text-slate-100 shadow-2xl border border-purple-500/30">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white bg-slate-900/60 p-2 rounded-full border border-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Community & Usage Rules</h3>
            <p className="text-xs text-slate-400">Guidelines for all Subtie translators</p>
          </div>
        </div>

        {/* Rules list */}
        <div className="space-y-3">
          {rules.map((rule, idx) => (
            <div key={idx} className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 text-xs font-semibold mt-0.5">
                {idx + 1}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-200">{rule.title}</h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{rule.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium text-sm hover:opacity-90 transition shadow-lg shadow-purple-500/20"
          >
            I Agree & Understand
          </button>
        </div>

      </div>
    </div>
  );
}
