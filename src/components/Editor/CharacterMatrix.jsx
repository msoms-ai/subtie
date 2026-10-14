import React, { useState, useEffect } from 'react';
import { Users, Save, Sparkles, RefreshCw, CheckCircle2, User, AlertCircle } from 'lucide-react';

function CharacterCard({ character, onSave, isSaving, lang }) {
  const isAr = lang === 'ar';

  const [japaneseName, setJapaneseName] = useState(character.japaneseName || '');
  const [englishName, setEnglishName] = useState(character.englishName || '');
  const [arabicName, setArabicName] = useState(character.arabicName || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [successPing, setSuccessPing] = useState(false);

  // Sync state if character props change from parent
  useEffect(() => {
    setJapaneseName(character.japaneseName || '');
    setEnglishName(character.englishName || '');
    setArabicName(character.arabicName || '');
  }, [character.japaneseName, character.englishName, character.arabicName]);

  // Check if modified compared to prop
  const isDirty =
    japaneseName.trim() !== (character.japaneseName || '').trim() ||
    englishName.trim() !== (character.englishName || '').trim() ||
    arabicName.trim() !== (character.arabicName || '').trim();

  const handleUpdate = async () => {
    if (!isDirty || isUpdating) return;
    setIsUpdating(true);
    const success = await onSave(
      character.id,
      {
        japanese: character.japaneseName || '',
        english: character.englishName || '',
        arabic: character.arabicName || '',
      },
      {
        japanese: japaneseName.trim(),
        english: englishName.trim(),
        arabic: arabicName.trim(),
      }
    );
    setIsUpdating(false);
    if (success) {
      setSuccessPing(true);
      setTimeout(() => setSuccessPing(false), 2500);
    }
  };

  return (
    <div
      className={`relative rounded-2xl p-3.5 border transition-all duration-300 flex flex-col justify-between ${
        isDirty
          ? 'bg-gradient-to-b from-purple-950/70 to-pink-950/50 border-pink-500/60 shadow-lg shadow-pink-500/10 ring-1 ring-pink-500/30'
          : 'bg-slate-900/90 border-purple-500/25 hover:border-purple-500/40'
      }`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Card Header: Avatar + Display Name + Mention Count */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-purple-950 border border-purple-500/40 shrink-0 flex items-center justify-center shadow-md">
          {character.avatarUrl ? (
            <img
              src={character.avatarUrl}
              alt={character.arabicName || character.englishName || 'Character'}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <User className="w-5 h-5 text-purple-300" />
          )}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <h4 className="text-xs font-black text-white truncate" title={character.arabicName || character.englishName}>
              {character.arabicName || character.englishName || character.japaneseName || (isAr ? 'شخصية غير مسماة' : 'Character')}
            </h4>
            {character.mentionsCount ? (
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-[10px] font-bold text-purple-300 whitespace-nowrap">
                {character.mentionsCount} {isAr ? 'سطر' : 'lines'}
              </span>
            ) : null}
          </div>
          <p className="text-[10px] text-slate-400 truncate font-mono">
            {character.japaneseName || character.englishName || '—'}
          </p>
        </div>
      </div>

      {/* 3 Editable Inputs */}
      <div className="space-y-2 mb-3">
        {/* Japanese Name */}
        <div>
          <label className="text-[10px] font-bold text-purple-300/80 mb-0.5 block">
            {isAr ? 'الاسم باليابانية (Kanji/Kana)' : 'Japanese Name (Kanji/Kana)'}
          </label>
          <input
            type="text"
            value={japaneseName}
            onChange={(e) => setJapaneseName(e.target.value)}
            placeholder="まる子 / さくら ももこ"
            className="w-full bg-slate-950/80 border border-purple-500/25 focus:border-pink-500 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none transition font-sans"
            dir="ltr"
          />
        </div>

        {/* English Name */}
        <div>
          <label className="text-[10px] font-bold text-purple-300/80 mb-0.5 block">
            {isAr ? 'الاسم بالإنجليزية (Romaji)' : 'English Name (Romaji)'}
          </label>
          <input
            type="text"
            value={englishName}
            onChange={(e) => setEnglishName(e.target.value)}
            placeholder="Maruko / Momoko Sakura"
            className="w-full bg-slate-950/80 border border-purple-500/25 focus:border-pink-500 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none transition font-sans"
            dir="ltr"
          />
        </div>

        {/* Arabic Name */}
        <div>
          <label className="text-[10px] font-bold text-pink-300/90 mb-0.5 block">
            {isAr ? 'الاسم بالعربية (ترجمة إمسومس)' : 'Arabic Name (Fansub)'}
          </label>
          <input
            type="text"
            value={arabicName}
            onChange={(e) => setArabicName(e.target.value)}
            placeholder="ماروكو / موموكو ساكورا"
            className="w-full bg-slate-950/80 border border-purple-500/25 focus:border-pink-500 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none transition font-bold"
            dir="rtl"
          />
        </div>
      </div>

      {/* Save / Update Button (Enabled only if modified) */}
      <button
        type="button"
        onClick={handleUpdate}
        disabled={!isDirty || isUpdating || isSaving}
        className={`w-full py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer ${
          successPing
            ? 'bg-emerald-600 text-white'
            : isDirty
            ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-pink-500/20 animate-pulse'
            : 'bg-slate-800/60 border border-slate-700/40 text-slate-500 cursor-not-allowed opacity-60'
        }`}
      >
        {successPing ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            <span>{isAr ? 'تم استبدال الاسم بنجاح' : 'Replaced in subtitles!'}</span>
          </>
        ) : isUpdating ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
            <span>{isAr ? 'جاري الاستبدال...' : 'Replacing in script...'}</span>
          </>
        ) : (
          <>
            <Save className={`w-3.5 h-3.5 ${isDirty ? 'text-white' : 'text-slate-500'}`} />
            <span>
              {isDirty
                ? isAr
                  ? 'حفظ واستبدال في السكربت'
                  : 'Update Subtitle Lines'
                : isAr
                ? 'لا توجد تعديلات'
                : 'No Changes'}
            </span>
          </>
        )}
      </button>
    </div>
  );
}

export default function CharacterMatrix({
  characters = [],
  onSaveCharacter,
  onDetectCharacters,
  isDetecting = false,
  isSaving = false,
  lang = 'en',
}) {
  const isAr = lang === 'ar';
  const safeList = Array.isArray(characters) ? characters : [];

  return (
    <div className="rounded-3xl bg-slate-950/70 border border-purple-500/25 p-4 shadow-xl space-y-3.5" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-purple-500/15 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-purple-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black text-white">
                {isAr ? 'مصفوفة أسماء الشخصيات في الحلقة' : 'Character Names & Glossary Matrix'}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-[10px] font-black text-purple-200">
                {safeList.length} {isAr ? 'شخصية' : 'Characters'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isAr
                ? 'عدّل أي اسم باليابانية أو الإنجليزية أو العربية، ثم اضغط حفظ لاستبدال الاسم في كامل الترجمة تلقائياً.'
                : 'Edit any name in Japanese, English, or Arabic. Click save to batch-replace across all subtitle lines.'}
            </p>
          </div>
        </div>

        {/* Rescan / Extract Button */}
        {onDetectCharacters && (
          <button
            type="button"
            onClick={onDetectCharacters}
            disabled={isDetecting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950 hover:bg-purple-900 border border-purple-500/30 text-xs font-bold text-purple-200 hover:text-white transition cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
            title={isAr ? 'إعادة استخراج أسماء الشخصيات بالذكاء الاصطناعي' : 'Re-scan characters using AI'}
          >
            <Sparkles className={`w-3.5 h-3.5 text-pink-400 ${isDetecting ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {isDetecting
                ? isAr
                  ? 'جاري الكشف...'
                  : 'Detecting...'
                : isAr
                ? 'استخراج الشخصيات'
                : 'Re-scan Characters'}
            </span>
          </button>
        )}
      </div>

      {/* 2-Column Responsive Character Card Grid */}
      {safeList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {safeList.map((char) => (
            <CharacterCard
              key={char.id}
              character={char}
              onSave={onSaveCharacter}
              isSaving={isSaving}
              lang={lang}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-6 px-4 rounded-2xl bg-purple-950/20 border border-purple-500/15 space-y-2">
          <Users className="w-8 h-8 text-purple-400/50 mx-auto" />
          <p className="text-xs font-bold text-slate-300">
            {isAr
              ? 'لم يتم استخراج أسماء الشخصيات بعد.'
              : 'No characters detected yet.'}
          </p>
          {onDetectCharacters && (
            <button
              onClick={onDetectCharacters}
              disabled={isDetecting}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-black shadow-md transition hover:opacity-90 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAr ? 'استخراج الشخصيات الآن' : 'Scan Characters with AI'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
