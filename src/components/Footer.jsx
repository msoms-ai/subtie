import React from 'react';

export default function Footer({ onOpenAbout, onOpenContact, onOpenRules }) {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-slate-950/90 py-10 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center space-y-6">
        
        {/* Navigation Links */}
        <nav className="flex flex-wrap justify-center items-center gap-6 sm:gap-10 text-sm font-medium text-slate-400">
          <button
            onClick={onOpenAbout}
            className="hover:text-purple-400 transition-colors"
          >
            About
          </button>
          <span className="text-slate-700">•</span>
          <button
            onClick={onOpenContact}
            className="hover:text-pink-400 transition-colors"
          >
            Contact
          </button>
          <span className="text-slate-700">•</span>
          <button
            onClick={onOpenRules}
            className="hover:text-purple-400 transition-colors"
          >
            Rules
          </button>
        </nav>

        {/* Required Bottom Branding Line */}
        <div className="text-center">
          <p className="text-xs sm:text-sm font-medium text-slate-400/90 tracking-wide">
            an initiative from <span className="text-purple-400 font-semibold">msoms.ai</span> team - 2026
          </p>
        </div>

      </div>
    </footer>
  );
}
