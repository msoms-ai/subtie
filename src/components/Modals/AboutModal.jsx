import React from 'react';
import { X, Info, Sparkles, Award, History, Cpu } from 'lucide-react';

export default function AboutModal({ isOpen, onClose, lang = 'en' }) {
  if (!isOpen) return null;
  const isAr = lang === 'ar';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl glass-panel-glow rounded-3xl p-6 sm:p-8 text-slate-100 shadow-2xl border border-purple-500/30">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-5 ${isAr ? 'left-5' : 'right-5'} text-slate-300 hover:text-white bg-purple-950 theme-light:bg-purple-800 p-2 rounded-full border border-purple-500/40 transition shadow-md`}
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3.5 rtl:space-x-reverse mb-6" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 border border-purple-400 flex items-center justify-center text-white shrink-0 shadow-lg">
            <Award className="w-6 h-6 text-yellow-300" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-white theme-light:text-slate-950">
              {isAr ? 'عن منصة Subtie وإرث مسومس أنمي' : 'About Subtie & MSOMS-Anime Legacy'}
            </h3>
            <p className="text-xs sm:text-sm text-purple-300 theme-light:text-purple-950 font-black">
              {isAr ? 'امتداد لمسيرة رواد ترجمة الأنمي العربي منذ عام 2000' : 'Continuation of the Arabic Anime Subbing Leadership Since 2000'}
            </p>
          </div>
        </div>

        {/* Content Body with High-Contrast White Text */}
        <div className="space-y-4 text-xs sm:text-sm text-white leading-relaxed font-bold max-h-[60vh] overflow-y-auto pr-1 pl-1" dir={isAr ? 'rtl' : 'ltr'}>
          {isAr ? (
            <>
              {/* Historical Legacy Highlight Banner */}
              <div className="p-4 rounded-2xl bg-purple-950 theme-light:bg-purple-800 border-2 border-purple-400 shadow-md space-y-2 wizard-white-text">
                <div className="flex items-center space-x-2 rtl:space-x-reverse text-yellow-300">
                  <History className="w-5 h-5 shrink-0" />
                  <h4 className="text-sm sm:text-base font-black text-white">تاريخ وأصالة مسومس أنمي (MSOMS-Anime)</h4>
                </div>
                <p className="text-xs sm:text-sm text-white font-bold leading-relaxed">
                  تأسست شبكة وفريق <strong className="text-yellow-300">مسومس أنمي (MSOMS-Anime)</strong> في عام <strong className="text-pink-300">2000م</strong>، لتكون الصرح الأب والريادي الأول الذي يقود حركة ترجمة الأنمي والمانغا في العالم العربي. على مدى أكثر من ربع قرن، أرست مسومس أعلى معايير الإتقان والجودة والفصاحة في ترجمة أشهر الأعمال العالمية مثل <em>المحقق كونان، ون بيس، وناروتو</em> وغيرها.
                </p>
              </div>

              {/* Subtie Modern Continuation */}
              <div className="p-4 rounded-2xl bg-purple-950 theme-light:bg-purple-800 border-2 border-purple-400/80 shadow-md space-y-2 wizard-white-text">
                <div className="flex items-center space-x-2 rtl:space-x-reverse text-pink-300">
                  <Cpu className="w-5 h-5 shrink-0" />
                  <h4 className="text-sm sm:text-base font-black text-white">منصة Subtie • العصر الجديد للترجمة</h4>
                </div>
                <p className="text-xs sm:text-sm text-white font-bold leading-relaxed">
                  تأتي منصة <strong className="text-pink-300">Subtie</strong> (من ابتكار فريق <strong className="text-sky-300">msoms.ai</strong>) كـ <strong>استمرار وتتويج حديث</strong> لهذا الإرث العريق. حيث تدمج بين الروح والخبرة التاريخية لمترجمي مسومس وبين أحدث تقنيات الذكاء الاصطناعي لتفريغ الصوت الياباني والتزامن بدقة الملي ثانية.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900 to-indigo-900 border border-purple-400 flex items-start space-x-3 rtl:space-x-reverse shadow-md wizard-white-text">
                <Sparkles className="w-5 h-5 text-yellow-300 shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-white font-black leading-relaxed">
                  رؤيتنا هي تمكين الفرق والمترجمين المستقلين من إنتاج ترجمات أنمي عربية فائقة الجودة بسرعة قياسية، مع الحفاظ الكامل على اللمسة البشرية والإبداع الفني الذي تميز به فريق مسومس منذ تأسيسه.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Historical Legacy Banner (English) */}
              <div className="p-4 rounded-2xl bg-purple-950 theme-light:bg-purple-800 border-2 border-purple-400 shadow-md space-y-2 wizard-white-text">
                <div className="flex items-center space-x-2 text-yellow-300">
                  <History className="w-5 h-5 shrink-0" />
                  <h4 className="text-sm sm:text-base font-black text-white">The Historic MSOMS-Anime Legacy (Since 2000)</h4>
                </div>
                <p className="text-xs sm:text-sm text-white font-bold leading-relaxed">
                  Founded in <strong className="text-yellow-300">2000</strong>, <strong className="text-pink-300">MSOMS-Anime</strong> established itself as the undisputed founding titan and leader of the Arabic anime fansubbing movement. For over 25 years, MSOMS set the gold standard for linguistic precision and cultural authenticity across legendary series like <em>Detective Conan, One Piece, and Naruto</em>.
                </p>
              </div>

              {/* Subtie Modern Evolution */}
              <div className="p-4 rounded-2xl bg-purple-950 theme-light:bg-purple-800 border-2 border-purple-400/80 shadow-md space-y-2 wizard-white-text">
                <div className="flex items-center space-x-2 text-pink-300">
                  <Cpu className="w-5 h-5 shrink-0" />
                  <h4 className="text-sm sm:text-base font-black text-white">Subtie • The AI-Powered Evolution</h4>
                </div>
                <p className="text-xs sm:text-sm text-white font-bold leading-relaxed">
                  <strong className="text-pink-300">Subtie</strong> (created by <strong className="text-sky-300">msoms.ai</strong>) serves as the direct technological continuation and modern expansion of this 25-year fansubbing heritage. It bridges decades of MSOMS translation expertise with cutting-edge AI Japanese ASR transcription and millisecond timestamp precision.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900 to-indigo-900 border border-purple-400 flex items-start space-x-3 shadow-md wizard-white-text">
                <Sparkles className="w-5 h-5 text-yellow-300 shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-white font-black leading-relaxed">
                  Our mission is to empower anime fansubbers worldwide to produce authentic, broadcast-grade Arabic subtitles with lightning speed while preserving full human creative mastery over phrasing and nuance.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 theme-light:border-purple-300 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white font-black text-xs sm:text-sm shadow-xl wizard-white-text border border-purple-400/40"
          >
            {isAr ? 'حسناً، فهمت' : 'Got it'}
          </button>
        </div>

      </div>
    </div>
  );
}
