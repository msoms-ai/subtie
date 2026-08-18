import React from 'react';
import { X, ShieldAlert, Check } from 'lucide-react';

export default function RulesModal({ isOpen, onClose, lang = 'en' }) {
  if (!isOpen) return null;
  const isAr = lang === 'ar';

  const rulesEn = [
    {
      title: 'No Illegal or Unethical Content',
      description: 'Translators must refrain from uploading or generating subtitles for illegal, sexually explicit, or abusive video content.'
    },
    {
      title: 'Respect MSOMS & Fansub Legacy',
      description: 'Honor the 25+ years of Arabic anime fansubbing tradition by acknowledging original creators, voice actors, and translation collaborators.'
    },
    {
      title: 'High Translation Quality & Authenticity',
      description: 'Ensure accurate, natural Arabic phrasing that preserves original Japanese context and character tone without awkward literal translations.'
    },
    {
      title: 'Platform & Data Safety',
      description: 'Do not use automated scripts or bots to spam the AI audio processing backend or upload corrupted media files.'
    }
  ];

  const rulesAr = [
    {
      title: 'الالتزام بمحتوى أخلاقي ومناسب',
      description: 'يمنع منعاً باتاً رفع أو ترجمة المقاطع الإباحية أو المحتوى الذي يخالف الآداب العامة أو القوانين.'
    },
    {
      title: 'احترام تاريخ وتراث مسومس أنمي',
      description: 'تقدير تاريخ وحقوق الفرق الرائدة التي أرست قواعد الترجمة العربية منذ عام 2000، ونسب الفضل لصناع العمل والمترجمين.'
    },
    {
      title: 'الدقة والجودة في الصياغة العربية',
      description: 'الحرص على اختيار صياغة عربية سليمة وفصيحة تناسب سياق شخصيات الأنمي والمانغا دون اللجوء للترجمة الحرفية الركيكة.'
    },
    {
      title: 'حماية البيانات وعدم الإساءة للسيرفرات',
      description: 'عدم استخدام البرمجيات التلقائية لإرهاق خوادم المعالجة والذكاء الاصطناعي أو رفع ملفات تالفة.'
    }
  ];

  const rules = isAr ? rulesAr : rulesEn;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-xl glass-panel-glow rounded-3xl p-6 sm:p-8 text-slate-100 shadow-2xl border border-purple-500/30">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-5 ${isAr ? 'left-5' : 'right-5'} text-slate-300 hover:text-white bg-purple-950 theme-light:bg-purple-800 p-2 rounded-full border border-purple-500/40 transition shadow-md`}
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 rtl:space-x-reverse mb-6" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0 shadow-md">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-white theme-light:text-slate-950">
              {isAr ? 'قوانين الاستخدام والمنصة' : 'Community & Usage Rules'}
            </h3>
            <p className="text-xs text-purple-300 theme-light:text-purple-900 font-bold">
              {isAr ? 'إرشادات وتعليمات جميع مترجمي منصة Subtie' : 'Guidelines for all Subtie translators'}
            </p>
          </div>
        </div>

        {/* Rules list with SOLID PURPLE CONTAINERS & 100% PURE BOLD WHITE TEXT */}
        <div className="space-y-3.5" dir={isAr ? 'rtl' : 'ltr'}>
          {rules.map((rule, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-purple-950 theme-light:bg-purple-800 border-2 border-purple-400/60 shadow-md flex items-start space-x-3.5 rtl:space-x-reverse wizard-white-text">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center shrink-0 text-xs font-black mt-0.5 shadow-sm border border-purple-300">
                {idx + 1}
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-extrabold text-white mb-1">{rule.title}</h4>
                <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">{rule.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-7 pt-4 border-t border-slate-800 theme-light:border-purple-300 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white font-black text-xs sm:text-sm shadow-xl wizard-white-text border border-purple-400/40 flex items-center space-x-2 rtl:space-x-reverse"
          >
            <Check className="w-4 h-4 text-white" />
            <span>{isAr ? 'أوافق وأفهم التعليمات' : 'I Agree & Understand'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
