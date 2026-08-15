import React from 'react';

export default function Footer({ onOpenAbout, onOpenContact, onOpenRules, lang = 'en' }) {
  const isAr = lang === 'ar';

  return (
    <footer className="w-full border-t border-slate-800/80 theme-light:border-purple-300 bg-slate-950/95 theme-light:bg-white/95 py-10 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center space-y-6">
        
        {/* Navigation Links */}
        <nav className="flex flex-wrap justify-center items-center gap-6 sm:gap-10 text-sm sm:text-base font-extrabold text-white theme-light:text-slate-950">
          <button
            onClick={onOpenAbout}
            className="hover:text-purple-300 theme-light:hover:text-purple-700 transition-colors"
          >
            {isAr ? 'عن المنصة' : 'About'}
          </button>
          <span className="text-pink-400 font-black">•</span>
          <button
            onClick={onOpenContact}
            className="hover:text-pink-300 theme-light:hover:text-pink-700 transition-colors"
          >
            {isAr ? 'اتصل بنا' : 'Contact'}
          </button>
          <span className="text-pink-400 font-black">•</span>
          <button
            onClick={onOpenRules}
            className="hover:text-purple-300 theme-light:hover:text-purple-700 transition-colors"
          >
            {isAr ? 'القوانين والتعليمات' : 'Rules'}
          </button>
        </nav>

        {/* Required Bottom Branding Line in Solid Purple Pill (Always Pure Bold White Text) */}
        <div className="text-center">
          <div className="inline-block bg-purple-950 theme-light:bg-purple-700 px-5 py-2 rounded-full border border-purple-500/40 theme-light:border-purple-800 shadow-md">
            <p className="text-xs sm:text-sm font-black text-white tracking-wide">
              {isAr ? 'مبادرة من فريق ' : 'an initiative from '}
              <span className="text-pink-300 theme-light:text-yellow-300 font-black">msoms.ai</span>
              {isAr ? ' - 2026' : ' team - 2026'}
            </p>
          </div>
        </div>

      </div>
    </footer>
  );
}
