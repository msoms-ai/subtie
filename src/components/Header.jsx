import React from 'react';
import { Sparkles, Film, Sun, Moon, Globe, FolderKanban } from 'lucide-react';

export default function Header({ onGoHome, onOpenProjects, lang = 'en', theme = 'dark', onToggleLang, onToggleTheme }) {
  const isAr = lang === 'ar';
  const isLight = theme === 'light';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-purple-500/10 bg-slate-950/80 backdrop-blur-md theme-light:bg-white/95 theme-light:border-purple-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Left Branding */}
        <div className="flex items-center space-x-3 rtl:space-x-reverse cursor-pointer" onClick={onGoHome}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Film className="w-5 h-5 text-white" />
          </div>
          <span className="hidden sm:inline-block text-xs font-black uppercase tracking-wider text-purple-200 bg-purple-950/80 theme-light:bg-purple-700 theme-light:text-white px-3.5 py-1.5 rounded-full border border-purple-500/30 theme-light:border-purple-800 shadow-sm">
            {isAr ? 'منصة ترجمة الأنمي' : 'Anime Fansub Hub'}
          </span>
        </div>

        {/* Center Title */}
        <div className="relative cursor-pointer group" onClick={onGoHome}>
          <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 rounded-lg blur-lg opacity-25 group-hover:opacity-60 transition duration-500"></div>
          <div className="relative flex items-center space-x-2 rtl:space-x-reverse">
            <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight glitter-title font-['Outfit']">
              Subtie
            </h1>
            <Sparkles className="w-5 h-5 text-pink-400 animate-pulse" />
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 rtl:space-x-reverse">
          
          {/* Language Switcher Button (Vibrant & High-Contrast) */}
          <button
            onClick={onToggleLang}
            className="flex items-center space-x-1.5 rtl:space-x-reverse px-3.5 py-2 rounded-xl text-xs font-black bg-purple-950/80 theme-light:bg-purple-700 text-purple-200 theme-light:text-white border border-purple-500/40 theme-light:border-purple-800 shadow-md transition hover:scale-105"
            title="Switch Language / تغيير اللغة"
          >
            <Globe className="w-4 h-4 text-pink-400 theme-light:text-yellow-300" />
            <span className="font-black text-xs">{isAr ? 'EN' : 'عربي'}</span>
          </button>

          {/* Theme Switcher (Sleek Matching Pill Button) */}
          <button
            onClick={onToggleTheme}
            className="flex items-center space-x-1.5 rtl:space-x-reverse px-3.5 py-2 rounded-xl text-xs font-black bg-purple-950/80 theme-light:bg-purple-700 text-amber-300 theme-light:text-yellow-300 border border-purple-500/40 theme-light:border-purple-800 shadow-md transition hover:scale-105"
            title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {isLight ? (
              <>
                <Moon className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                <span className="hidden md:inline text-white font-extrabold">{isAr ? 'داكن' : 'Dark'}</span>
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="hidden md:inline text-purple-200 font-extrabold">{isAr ? 'مضيء' : 'Light'}</span>
              </>
            )}
          </button>

          {/* My Projects Button */}
          <button
            onClick={onOpenProjects}
            className="flex items-center space-x-2 rtl:space-x-reverse text-xs sm:text-sm font-black text-white bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:opacity-90 px-4 py-2 rounded-xl transition-all shadow-md shadow-purple-500/20"
          >
            <FolderKanban className="w-4 h-4 text-pink-200" />
            <span>{isAr ? 'مشاريعي' : 'My Projects'}</span>
          </button>

        </div>

      </div>
    </header>
  );
}
