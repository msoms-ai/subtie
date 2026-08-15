import React from 'react';
import { X, Info, Sparkles } from 'lucide-react';

export default function AboutModal({ isOpen, onClose, lang = 'en' }) {
  if (!isOpen) return null;
  const isAr = lang === 'ar';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl glass-panel-glow rounded-3xl p-6 sm:p-8 text-slate-100 shadow-2xl border border-purple-500/30">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-5 ${isAr ? 'left-5' : 'right-5'} text-slate-400 hover:text-white bg-slate-900/60 p-2 rounded-full border border-slate-800 transition`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 rtl:space-x-reverse mb-6" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white theme-light:text-slate-950">
              {isAr ? 'عن منصة Subtie' : 'About Subtie Project'}
            </h3>
            <p className="text-xs text-purple-300 theme-light:text-purple-900 font-semibold">
              {isAr ? 'تمكين مجتمع مترجمي الأنمي والمانغا حول العالم' : 'Empowering Anime Fan Translators Worldwide'}
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="space-y-4 text-sm text-slate-300 theme-light:text-slate-800 leading-relaxed font-normal" dir={isAr ? 'rtl' : 'ltr'}>
          {isAr ? (
            <>
              <p>
                نشأت منصة <strong className="text-purple-300 theme-light:text-purple-900">Subtie</strong> من شغف عميق بمجتمع ترجمة الأنمي والمانغا العربي والعالمي. لعقود طويلة، قضاها المترجمون في تفريغ الصوتيات وتوقيت التزامن يدوياً عبر أدوات متعددة ومعقدة.
              </p>
              <p>
                تأتي Subtie لتغير هذا المفهوم كلياً عبر دمج تقنيات الذكاء الاصطناعي الحديثة لتفريغ الصوتيات اليابانية، والترجمة الأولية التلقائية، مع توقيت زمني دقيق في بيئة عمل تشاركية مصممة خصيصاً للترجمة العربية.
              </p>
              <div className="p-4 rounded-2xl bg-purple-950/40 theme-light:bg-purple-100 border border-purple-500/20 theme-light:border-purple-300 flex items-start space-x-3 rtl:space-x-reverse mt-4">
                <Sparkles className="w-5 h-5 text-purple-400 theme-light:text-purple-700 shrink-0 mt-0.5" />
                <p className="text-xs text-purple-200 theme-light:text-purple-950 font-semibold">
                  هدفنا الرئيسي هو مساعدة فرق الترجمة على تقديم ترجمات عالية الجودة بسرعة وسلاسة مع الاحتفاظ بالتحكم البشري الكامل على الصياغة والدقة.
                </p>
              </div>
            </>
          ) : (
            <>
              <p>
                <strong className="text-purple-300 theme-light:text-purple-900">Subtie</strong> was born out of a deep passion for the global Anime fansubbing community. For decades, dedicated fan translators painstakingly transcribed audio line-by-line, timestamped dialogues manually, and coordinated translations across separate tools.
              </p>
              <p>
                Subtie revolutionizes this workflow by combining cutting-edge AI speech transcription, automated initial Arabic translations, and timestamp alignment with an interactive, collaborative workspace tailored for Arabic typography and fansub standards.
              </p>

              <div className="p-4 rounded-2xl bg-purple-950/40 theme-light:bg-purple-100 border border-purple-500/20 theme-light:border-purple-300 flex items-start space-x-3 mt-4">
                <Sparkles className="w-5 h-5 text-purple-400 theme-light:text-purple-700 shrink-0 mt-0.5" />
                <p className="text-xs text-purple-200 theme-light:text-purple-950 font-semibold">
                  Our mission is to assist fansubbers in delivering high-quality, authentic translations faster than ever while preserving full human creative control over phrasing and nuance.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="mt-8 pt-4 border-t border-slate-800 theme-light:border-slate-300 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm hover:opacity-90 transition shadow-lg shadow-purple-500/25"
          >
            {isAr ? 'حسناً، فهمت' : 'Got it'}
          </button>
        </div>

      </div>
    </div>
  );
}
