import React, { useState } from 'react';
import { Sparkles, Film, Sun, Moon, Globe, FolderKanban, User, LogIn, LogOut, ShieldCheck, Settings, ChevronDown } from 'lucide-react';

export default function Header({
  onGoHome,
  onOpenProjects,
  lang = 'en',
  theme = 'dark',
  onToggleLang,
  onToggleTheme,
  user,
  onOpenAuth,
  onOpenProfile,
  onOpenAdminConsole,
  onLogout
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isAr = lang === 'ar';
  const isLight = theme === 'light';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-purple-500/10 bg-slate-950/85 backdrop-blur-md theme-light:bg-white/95 theme-light:border-purple-600">
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
        <div className="flex items-center space-x-2 sm:space-x-3 rtl:space-x-reverse">
          
          {/* Language Switcher */}
          <button
            onClick={onToggleLang}
            className="flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-2 rounded-xl text-xs font-black bg-purple-950/80 theme-light:bg-purple-700 text-purple-200 theme-light:text-white border border-purple-500/40 theme-light:border-purple-800 shadow-md transition hover:scale-105"
            title="Switch Language / تغيير اللغة"
          >
            <Globe className="w-4 h-4 text-pink-400 theme-light:text-yellow-300" />
            <span className="font-black text-xs">{isAr ? 'EN' : 'عربي'}</span>
          </button>

          {/* Theme Switcher */}
          <button
            onClick={onToggleTheme}
            className="flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-2 rounded-xl text-xs font-black bg-purple-950/80 theme-light:bg-purple-700 text-amber-300 theme-light:text-yellow-300 border border-purple-500/40 theme-light:border-purple-800 shadow-md transition hover:scale-105"
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
            className="flex items-center space-x-2 rtl:space-x-reverse text-xs sm:text-sm font-black text-white bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:opacity-90 px-3.5 py-2 rounded-xl transition-all shadow-md shadow-purple-500/20"
          >
            <FolderKanban className="w-4 h-4 text-pink-200" />
            <span className="hidden sm:inline">{isAr ? 'مشاريعي' : 'My Projects'}</span>
          </button>

          {/* User Profile Avatar & Dropdown Menu */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2 rtl:space-x-reverse p-1.5 sm:px-3 sm:py-1.5 rounded-2xl bg-purple-950/90 theme-light:bg-purple-800 border-2 border-purple-400/80 shadow-lg hover:scale-105 transition"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 text-white font-black flex items-center justify-center border border-purple-300 overflow-hidden shrink-0">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{(user.firstName || 'U')[0].toUpperCase()}</span>
                  )}
                </div>
                <div className="hidden lg:block text-right rtl:text-left text-xs font-black">
                  <span className="block text-white wizard-white-text leading-tight">{user.firstName}</span>
                  <span className="text-[10px] text-pink-300 block">{user.role}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-white" />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div
                  className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-56 glass-panel rounded-2xl border border-purple-500/40 shadow-2xl p-2 z-50 text-xs font-bold space-y-1 bg-slate-950/95 text-white"
                  onClick={() => setDropdownOpen(false)}
                >
                  <div className="p-2.5 border-b border-purple-500/20 text-center">
                    <span className="block font-black text-white">{user.firstName} {user.lastName}</span>
                    <span className="text-[10px] text-purple-300 block">{user.email}</span>
                    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black wizard-white-text ${
                      user.role === 'Admin' ? 'bg-rose-600 text-white' : user.role === 'Auditor' ? 'bg-amber-600 text-white' : 'bg-purple-600 text-white'
                    }`}>
                      {user.role}
                    </span>
                  </div>

                  <button
                    onClick={onOpenProfile}
                    className="w-full flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 rounded-xl hover:bg-purple-900/60 transition text-purple-200"
                  >
                    <Settings className="w-4 h-4 text-pink-400" />
                    <span>{isAr ? 'الملف الشخصي والإعدادات' : 'Profile & Settings'}</span>
                  </button>

                  {user.role === 'Admin' && (
                    <button
                      onClick={onOpenAdminConsole}
                      className="w-full flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 rounded-xl hover:bg-purple-900/60 transition text-rose-300 font-black"
                    >
                      <ShieldCheck className="w-4 h-4 text-rose-400" />
                      <span>{isAr ? 'لوحة تحكم المدير (Admin)' : 'Admin Console'}</span>
                    </button>
                  )}

                  <button
                    onClick={onLogout}
                    className="w-full flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 rounded-xl hover:bg-rose-950/80 transition text-rose-400 font-black border-t border-purple-500/20 pt-2"
                  >
                    <LogOut className="w-4 h-4 text-rose-400" />
                    <span>{isAr ? 'تسجيل الخروج' : 'Sign Out'}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center space-x-1.5 rtl:space-x-reverse px-4 py-2 rounded-xl text-xs font-black bg-purple-950/90 theme-light:bg-purple-800 text-white border-2 border-purple-400/80 shadow-md hover:scale-105 transition wizard-white-text"
            >
              <LogIn className="w-4 h-4 text-pink-400" />
              <span>{isAr ? 'تسجيل الدخول' : 'Sign In'}</span>
            </button>
          )}

        </div>

      </div>
    </header>
  );
}
