import React from 'react';
import { Check, X } from 'lucide-react';

export default function PasswordRulesIndicator({ password = '', lang = 'en' }) {
  const isAr = lang === 'ar';

  const rules = [
    {
      id: 'minLength',
      label: isAr ? '8 أحرف على الأقل' : 'At least 8 characters long',
      passed: password.length >= 8
    },
    {
      id: 'hasLower',
      label: isAr ? 'حرف صغير واحد على الأقل (a-z)' : 'At least 1 lowercase letter (a-z)',
      passed: /[a-z]/.test(password)
    },
    {
      id: 'hasUpper',
      label: isAr ? 'حرف كبير واحد على الأقل (A-Z)' : 'At least 1 uppercase letter (A-Z)',
      passed: /[A-Z]/.test(password)
    },
    {
      id: 'hasNumber',
      label: isAr ? 'رقم واحد على الأقل (0-9)' : 'At least 1 number (0-9)',
      passed: /[0-9]/.test(password)
    },
    {
      id: 'hasSpecial',
      label: isAr ? 'رمز خاص واحد على الأقل (!@#$%^&*)' : 'At least 1 special character (!@#$%^&*)',
      passed: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    }
  ];

  const totalPassed = rules.filter(r => r.passed).length;
  const strengthPercentage = (totalPassed / rules.length) * 100;

  return (
    <div className="space-y-2.5 p-3.5 rounded-2xl bg-purple-950/80 theme-light:bg-purple-100 border border-purple-500/30 theme-light:border-purple-300" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between text-xs font-black">
        <span className="text-purple-200 theme-light:text-purple-950">
          {isAr ? 'شروط وقوة كلمة المرور:' : 'Password Security Requirements:'}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
          strengthPercentage === 100
            ? 'bg-emerald-500 text-white'
            : strengthPercentage >= 60
            ? 'bg-amber-500 text-white'
            : 'bg-rose-500 text-white'
        }`}>
          {totalPassed} / {rules.length} {isAr ? 'مكتمل' : 'Passed'}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800 theme-light:bg-slate-300 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            strengthPercentage === 100
              ? 'bg-emerald-500'
              : strengthPercentage >= 60
              ? 'bg-amber-500'
              : 'bg-rose-500'
          }`}
          style={{ width: `${strengthPercentage}%` }}
        />
      </div>

      {/* Rule Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px] font-bold">
        {rules.map(rule => (
          <div
            key={rule.id}
            className={`flex items-center space-x-1.5 rtl:space-x-reverse transition ${
              rule.passed
                ? 'text-emerald-400 theme-light:text-emerald-700'
                : 'text-slate-400 theme-light:text-slate-600'
            }`}
          >
            <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
              rule.passed
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-500 border border-slate-700'
            }`}>
              {rule.passed ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
            </div>
            <span>{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
