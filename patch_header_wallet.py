import re

with open('src/components/Header.jsx', 'r') as f:
    code = f.read()

target = """          {/* My Projects Button (Only visible if logged in) */}
          {user && ("""

replacement = """          {/* Wallet Widget */}
          {user && (
            <div
              className="flex items-center space-x-1 sm:space-x-1.5 rtl:space-x-reverse px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black bg-slate-900/80 theme-light:bg-white text-yellow-400 theme-light:text-amber-500 border border-yellow-500/30 shadow-inner"
              title={isAr ? 'رصيد الدقائق المتبقية' : 'Remaining Minute Balance'}
            >
              <span className="text-sm leading-none">🪙</span>
              <span className="font-extrabold whitespace-nowrap">{user.minuteBalance !== undefined ? user.minuteBalance : 0} {isAr ? 'دقيقة' : 'Mins'}</span>
            </div>
          )}

          {/* My Projects Button (Only visible if logged in) */}
          {user && ("""

code = code.replace(target, replacement)

# also add it into the dropdown menu right under their name
dropdown_target = """                  <div className="p-2.5 border-b border-purple-500/20 text-center">
                    <span className="block font-black text-white">{user.firstName} {user.lastName}</span>
                    <span className="text-[10px] text-purple-300 block">{user.email}</span>
                    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black wizard-white-text ${"""

dropdown_replacement = """                  <div className="p-2.5 border-b border-purple-500/20 text-center">
                    <span className="block font-black text-white">{user.firstName} {user.lastName}</span>
                    <span className="text-[10px] text-purple-300 block mb-1">{user.email}</span>
                    <div className="bg-slate-900 rounded-lg p-1.5 mb-1.5 flex justify-center items-center space-x-1 border border-yellow-500/30">
                       <span className="text-xs">🪙</span>
                       <span className="text-yellow-400 text-xs font-black">{user.minuteBalance !== undefined ? user.minuteBalance : 0} {isAr ? 'دقيقة متاحة' : 'Minutes left'}</span>
                    </div>
                    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black wizard-white-text ${"""

code = code.replace(dropdown_target, dropdown_replacement)

with open('src/components/Header.jsx', 'w') as f:
    f.write(code)

print("done")
