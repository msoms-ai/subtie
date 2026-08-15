import React from 'react';
import { X, ShieldAlert } from 'lucide-react';

export default function RulesModal({ isOpen, onClose, lang = 'en' }) {
  if (!isOpen) return null;
  const isAr = lang === 'ar';

  const rulesEn = [
    {
      title: 'No Illegal or NSFW Content',
      description: 'Translators must refrain from uploading or generating subtitles for illegal, sexually explicit, or abusive video content.'
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

  const rulesAr = [
    {
      title: 'الالتزام بمحتوى أخلاقي ومناسب',
      description: 'يمنع منعاً باتاً رفع أو ترجمة المقاطع الإباحية أو المحتوى الذي يخالف الآداب العامة أو القوانين.'
    },
    {
      title: 'احترام حقوق الملكية والترجمة',
      description: 'نسب الفضل لصناع العمل الأصليين، وتوقير جهود المترجمين وفرق الترجمة المشاركة.'
    },
    {
      title: 'الدقة والجودة في الصياغة العربية',
      description: 'الحرص على اختيار صياغة عربية سليمة ومناسبة لسياق شخصيات الأنمي والمانغا.'
    },
    {
      title: 'حماية البيانات وعدم الإساءة للسيرفرات',
      description: 'عدم استخدام البرمجيات التلقائية لإرهاق خوادم المعالجة والذكاء الاصطناعي.'
    }
  ];

  const rules = isAr ? rulesAr : rulesEn;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg glass-panel-glow rounded-3xl p-6 sm:p-8 text-slate-100 shadow-2xl border border-purple-500/30">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-5 ${isAr ? 'left-5' : 'right-5'} text-slate-400 hover:text-white bg-slate-900/60 p-2 rounded-full border border-slate-800 transition`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 rtl:space-x-reverse mb-6" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white theme-light:text-slate-950">
              {isAr ? 'قوانين الاستخدام والمنصة' : 'Community & Usage Rules'}
            </h3>
            <p className="text-xs text-slate-400 theme-light:text-slate-700">
              {isAr ? 'إرشادات وتعليمات جميع مترجمي منصة Subtie' : 'Guidelines for all Subtie translators'}
            </p>
          </div>
        </div>

        {/* Rules list */}
        <div className="space-y-3" dir={isAr ? 'rtl' : 'ltr'}>
          {rules.map((rule, idx) => (
            <div key={idx} className="p-3.5 rounded-2xl bg-slate-900/80 theme-light:bg-purple-50 border border-slate-800/80 theme-light:border-purple-200 flex items-start space-x-3 rtl:space-x-reverse">
              <div className="w-6 h-6 rounded-full bg-purple-500/20 theme-light:bg-purple-700 theme-light:text-white text-purple-400 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                {idx + 1}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-200 theme-light:text-slate-950">{rule.title}</h4>
                <p className="text-xs text-slate-400 theme-light:text-slate-700 mt-0.5 leading-relaxed font-normal">{rule.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 theme-light:border-slate-300 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm hover:opacity-90 transition shadow-lg shadow-purple-500/20"
          >
            {isAr ? 'أوافق وأفهم التعليمات' : 'I Agree & Understand'}
          </button>
        </div>

      </div>
    </div>
  );
}
