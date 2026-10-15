import React, { useState } from 'react';
import { Eye, Sparkles, Plus, CheckCircle2, RefreshCw, Clock, MapPin, Film, Mail, Newspaper, Bookmark, Compass } from 'lucide-react';

const CATEGORY_MAP = {
  title: {
    labelAr: 'عنوان الحلقة',
    labelEn: 'Episode Title',
    color: 'from-pink-600 to-purple-600 text-pink-200 border-pink-500/40',
    icon: Film,
  },
  location: {
    labelAr: 'مكان وزمان',
    labelEn: 'Location & Time',
    color: 'from-blue-600 to-indigo-600 text-blue-200 border-blue-500/40',
    icon: MapPin,
  },
  sign: {
    labelAr: 'لافتة / يافطة',
    labelEn: 'Sign / Banner',
    color: 'from-amber-600 to-orange-600 text-amber-200 border-amber-500/40',
    icon: Bookmark,
  },
  letter: {
    labelAr: 'رسالة / نص هاتف',
    labelEn: 'Letter / Text Msg',
    color: 'from-emerald-600 to-teal-600 text-emerald-200 border-emerald-500/40',
    icon: Mail,
  },
  headline: {
    labelAr: 'مانشيت / صحيفة',
    labelEn: 'Headline / Book',
    color: 'from-rose-600 to-red-600 text-rose-200 border-rose-500/40',
    icon: Newspaper,
  },
};

const ASS_POSITIONS = [
  { value: '\\an8', labelAr: 'أعلى الوسط (Top Center)', labelEn: 'Top Center (\\an8)' },
  { value: '\\an2', labelAr: 'أسفل الوسط (Bottom Center)', labelEn: 'Bottom Center (\\an2)' },
  { value: '\\an7', labelAr: 'أعلى اليسار (Top Left)', labelEn: 'Top Left (\\an7)' },
  { value: '\\an9', labelAr: 'أعلى اليمين (Top Right)', labelEn: 'Top Right (\\an9)' },
  { value: '\\an5', labelAr: 'منتصف الشاشة (Center Screen)', labelEn: 'Center Screen (\\an5)' },
  { value: '\\an1', labelAr: 'أسفل اليسار (Bottom Left)', labelEn: 'Bottom Left (\\an1)' },
  { value: '\\an3', labelAr: 'أسفل اليمين (Bottom Right)', labelEn: 'Bottom Right (\\an3)' },
];

function VisualSignCard({ sign, onSeek, onAddToSubtitles, onUpdateSign, isAdding, lang }) {
  const isAr = lang === 'ar';
  const cat = CATEGORY_MAP[sign.category] || CATEGORY_MAP.sign;
  const CatIcon = cat.icon;

  const [arabicText, setArabicText] = useState(sign.arabicText || '');
  const [assPosition, setAssPosition] = useState(sign.assPosition || '\\an8');
  const [isSaved, setIsSaved] = useState(false);

  const isDirty =
    arabicText.trim() !== (sign.arabicText || '').trim() ||
    assPosition !== (sign.assPosition || '\\an8');

  const handleSave = () => {
    if (onUpdateSign) {
      onUpdateSign(sign.id, { arabicText: arabicText.trim(), assPosition });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  return (
    <div
      className={`rounded-2xl p-4 border transition-all duration-300 glass-panel space-y-3.5 ${
        sign.addedToSubtitles
          ? 'border-emerald-500/40 bg-emerald-950/20'
          : 'border-purple-500/25 hover:border-purple-500/50'
      }`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Header: Timestamp seek button + Category badge */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onSeek && onSeek(sign.startSeconds)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950 hover:bg-purple-900 border border-purple-500/40 text-white font-mono text-xs font-black shadow-sm transition hover:scale-105 cursor-pointer"
          title={isAr ? 'انقر للانتقال إلى توقيت المشهد في الفيديو' : 'Click to seek video to timestamp'}
        >
          <Clock className="w-3.5 h-3.5 text-pink-300" />
          <span>{sign.startTime} → {sign.endTime}</span>
        </button>

        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black border bg-gradient-to-r ${cat.color}`}>
          <CatIcon className="w-3.5 h-3.5" />
          <span>{isAr ? cat.labelAr : cat.labelEn}</span>
        </span>
      </div>

      {/* Frame Preview Image & Text Columns */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start">
        {/* Frame Snapshot */}
        <div className="md:col-span-4 rounded-xl overflow-hidden bg-black/60 border border-purple-500/30 aspect-video relative group cursor-pointer" onClick={() => onSeek && onSeek(sign.startSeconds)}>
          {sign.thumbnailUrl ? (
            <img
              src={sign.thumbnailUrl}
              alt="Scene preview"
              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-purple-400/50 p-2 text-center">
              <Eye className="w-6 h-6 mb-1" />
              <span className="text-[10px]">{isAr ? 'لقطة المشهد' : 'Scene Frame'}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold">
            <Eye className="w-4 h-4 mr-1 text-pink-300" />
            <span>{isAr ? 'عرض في الفيديو' : 'Seek Video'}</span>
          </div>
        </div>

        {/* Text Fields */}
        <div className="md:col-span-8 space-y-2 text-xs">
          {/* Japanese Text */}
          <div className="flex items-center gap-2">
            <span className="w-20 shrink-0 font-bold text-purple-400 text-[11px] text-left font-mono">
              Japanese:
            </span>
            <div className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-purple-500/25 text-purple-200 text-xs font-medium font-sans text-left" dir="ltr">
              {sign.japaneseText || '—'}
            </div>
          </div>

          {/* English Text */}
          <div className="flex items-center gap-2">
            <span className="w-20 shrink-0 font-bold text-slate-400 text-[11px] text-left font-mono">
              English:
            </span>
            <div className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-700/60 text-white text-xs font-medium font-sans text-left" dir="ltr">
              {sign.englishText || '—'}
            </div>
          </div>

          {/* Arabic Text (Editable) */}
          <div className="flex items-center gap-2">
            <span className="w-20 shrink-0 font-bold text-pink-400 text-[11px] text-right font-tahoma-arabic">
              {isAr ? 'الترجمة العربية:' : 'Arabic:'}
            </span>
            <input
              type="text"
              value={arabicText}
              onChange={(e) => setArabicText(e.target.value)}
              placeholder={isAr ? 'أدخل ترجمة اللوحة / العنوان...' : 'Enter Arabic translation...'}
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-purple-500/40 focus:border-pink-500 text-white text-xs font-bold font-tahoma-arabic text-right outline-none transition"
              dir="rtl"
            />
          </div>

          {/* ASS Screen Position Tag */}
          <div className="flex items-center gap-2 pt-1">
            <span className="w-20 shrink-0 font-bold text-indigo-300 text-[11px] flex items-center gap-1">
              <Compass className="w-3 h-3 text-indigo-400 shrink-0" />
              <span>{isAr ? 'الموضع:' : 'Position:'}</span>
            </span>
            <select
              value={assPosition}
              onChange={(e) => setAssPosition(e.target.value)}
              className="bg-slate-950 border border-purple-500/30 rounded-lg px-2.5 py-1 text-xs text-indigo-200 font-bold outline-none cursor-pointer"
            >
              {ASS_POSITIONS.map((pos) => (
                <option key={pos.value} value={pos.value}>
                  {isAr ? pos.labelAr : pos.labelEn}
                </option>
              ))}
            </select>

            {isDirty && (
              <button
                type="button"
                onClick={handleSave}
                className="px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-[11px] font-black transition cursor-pointer ml-auto"
              >
                {isSaved ? (isAr ? 'تم الحفظ' : 'Saved') : (isAr ? 'حفظ التعديل' : 'Save')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Action: Add to Subtitle Track */}
      <div className="flex items-center justify-between pt-2 border-t border-purple-500/15">
        <span className="text-[11px] text-slate-400 font-medium">
          {sign.addedToSubtitles ? (
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isAr ? 'تم إدراج هذا النص في سكربت الترجمة' : 'Added to subtitle script'}</span>
            </span>
          ) : (
            <span>{isAr ? 'يمكنك إدراج هذه اللوحة مباشرة في ملف الترجمة' : 'Convert this visual sign into a timed subtitle line'}</span>
          )}
        </span>

        <button
          type="button"
          onClick={() => onAddToSubtitles && onAddToSubtitles({ ...sign, arabicText, assPosition })}
          disabled={sign.addedToSubtitles || isAdding}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition shadow-md cursor-pointer ${
            sign.addedToSubtitles
              ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 cursor-not-allowed opacity-80'
              : 'bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:opacity-90 text-white shadow-purple-500/20'
          }`}
        >
          {sign.addedToSubtitles ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAr ? 'مدرج في الترجمة' : 'Included in Script'}</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>{isAr ? 'إدراج كسطر ترجمة' : 'Add to Subtitles'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function VisualSignsMatrix({
  visualSigns = [],
  onSeek,
  onAddToSubtitles,
  onUpdateSign,
  onDetectVisualSigns,
  isDetecting = false,
  isAdding = false,
  lang = 'en',
}) {
  const isAr = lang === 'ar';
  const safeList = Array.isArray(visualSigns) ? visualSigns : [];

  return (
    <div className="rounded-3xl bg-slate-950/70 border border-purple-500/25 p-4 shadow-xl space-y-4" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-500/15 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-pink-600/20 border border-pink-500/40 flex items-center justify-center shrink-0">
            <Eye className="w-4 h-4 text-pink-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black text-white">
                {isAr ? 'النصوص واللوحات المرئية في الفيديو (Visual OCR)' : 'On-Screen Visual Signs & Titles (Full Video)'}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-pink-500/20 border border-pink-500/30 text-[10px] font-black text-pink-200">
                {safeList.length} {isAr ? 'لوحة/نص' : 'Signs'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isAr
                ? 'عناوين الحلقات، لوحات الأماكن، والرسائل المكتوبة التي تم رصدها عبر الفيديو بالذكاء الاصطناعي.'
                : 'Episode titles, location cards, and signs detected across the video using Gemini Vision.'}
            </p>
          </div>
        </div>

        {/* Rescan Button */}
        {onDetectVisualSigns && (
          <button
            type="button"
            onClick={onDetectVisualSigns}
            disabled={isDetecting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950 hover:bg-purple-900 border border-purple-500/30 text-xs font-bold text-purple-200 hover:text-white transition cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
            title={isAr ? 'إعادة فحص الفيديو بحثاً عن النصوص المرئية' : 'Re-scan video for on-screen signs'}
          >
            <Sparkles className={`w-3.5 h-3.5 text-pink-400 ${isDetecting ? 'animate-spin' : ''}`} />
            <span>
              {isDetecting
                ? isAr
                  ? 'جاري فحص المشاهد...'
                  : 'Scanning Video...'
                : isAr
                ? 'إعادة مسح الفيديو'
                : 'Re-scan Visual Signs'}
            </span>
          </button>
        )}
      </div>

      {/* Signs Cards List */}
      {safeList.length > 0 ? (
        <div className="space-y-3.5">
          {safeList.map((sign) => (
            <VisualSignCard
              key={sign.id}
              sign={sign}
              onSeek={onSeek}
              onAddToSubtitles={onAddToSubtitles}
              onUpdateSign={onUpdateSign}
              isAdding={isAdding}
              lang={lang}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 px-4 rounded-2xl bg-purple-950/20 border border-purple-500/15 space-y-3">
          <Eye className="w-9 h-9 text-purple-400/50 mx-auto" />
          <div>
            <p className="text-xs font-bold text-slate-300">
              {isAr
                ? 'لم يتم استخراج نصوص أو لوحات مرئية في هذا الفيديو بعد.'
                : 'No visual on-screen signs detected for this video yet.'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {isAr
                ? 'يمكنك فحص الفيديو كاملاً للتعرف على عناوين الحلقات واللافتات وترجمتها تلقائياً.'
                : 'Click below to scan candidate video frames and extract titles, banners, and notes.'}
            </p>
          </div>
          {onDetectVisualSigns && (
            <button
              onClick={onDetectVisualSigns}
              disabled={isDetecting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white text-xs font-black shadow-md transition hover:opacity-90 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAr ? 'مسح نصوص الفيديو الآن (Gemini Vision)' : 'Scan Visual Signs with Gemini Vision'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
