import re

with open('src/components/Header.jsx', 'r') as f:
    code = f.read()

target = """export default function Header({ 
  onGoHome, 
  onOpenProjects, 
  onStartWizard, 
  lang, 
  theme, 
  onToggleLang, 
  onToggleTheme, 
  user,
  onOpenAuth,
  onOpenProfile,
  onOpenAdminConsole,
  onLogout
}) {"""

replacement = """export default function Header({ 
  onGoHome, 
  onOpenProjects, 
  onStartWizard, 
  onOpenPricing,
  lang, 
  theme, 
  onToggleLang, 
  onToggleTheme, 
  user,
  onOpenAuth,
  onOpenProfile,
  onOpenAdminConsole,
  onLogout
}) {"""

code = code.replace(target, replacement)

target2 = """          {/* Wallet Widget */}
          {user && (
            <div
              className="flex items-center space-x-1 sm:space-x-1.5 rtl:space-x-reverse px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black bg-slate-900/80 theme-light:bg-white text-yellow-400 theme-light:text-amber-500 border border-yellow-500/30 shadow-inner"
              title={isAr ? 'رصيد الدقائق المتبقية' : 'Remaining Minute Balance'}
            >"""

replacement2 = """          {/* Wallet Widget */}
          {user && (
            <button
              onClick={onOpenPricing}
              className="flex items-center space-x-1 sm:space-x-1.5 rtl:space-x-reverse px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black bg-slate-900/80 theme-light:bg-white text-yellow-400 theme-light:text-amber-500 border border-yellow-500/30 shadow-inner hover:scale-105 transition cursor-pointer"
              title={isAr ? 'شراء المزيد من الدقائق' : 'Top up Minutes'}
            >"""

code = code.replace(target2, replacement2).replace("</div>\n          )}\n\n          {/* My Projects Button", "</button>\n          )}\n\n          {/* My Projects Button")

with open('src/components/Header.jsx', 'w') as f:
    f.write(code)

print("done patching header navigation")
