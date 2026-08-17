import React, { useState, useEffect } from 'react';
import { Wand2, Sparkles, ArrowRight, ArrowLeft, Cloud, Tv, FolderKanban, Video, Layers, FileText } from 'lucide-react';

const MANGA_HERO_SLIDES = [
  {
    id: 'balloon-flight',
    imageUrl: 'https://images2.alphacoders.com/114/thumb-1920-1141246.jpg',
    japaneseText: '空を飛ぶ夢を、絶対に諦めない！',
    arabicText: '«لا تستسلم أبدًا عن حلم التحليق في أفق السماء!»'
  },
  {
    id: 'floating-island',
    imageUrl: 'https://cdn.leonardo.ai/users/b9f7e234-4521-44ad-ab5f-b002a673e324/generations/1f17823f-0d9c-6c70-924a-95e12802bae6/lucid-origin_a_cinematic_photo_of_A_brave_adventurer_embarks_on_his_journey_into_the_unknown_-0.jpg',
    japaneseText: 'この世界には、まだ見ぬ秘宝が眠っている。',
    arabicText: '«في هذا العالم الشاسع، لا تزال هناك أسرار وأسطورة تنتظر من يكتشفها!»'
  },
  {
    id: 'adventurer-view',
    imageUrl: 'https://cdn.leonardo.ai/users/b9f7e234-4521-44ad-ab5f-b002a673e324/generations/1f17823f-0d9c-6c70-924a-95e12802bae6/lucid-origin_a_cinematic_photo_of_A_brave_adventurer_embarks_on_his_journey_into_the_unknown_-1.jpg',
    japaneseText: '真実を確かめるために、俺たちは突き進む！',
    arabicText: '«من أجل الوصول إلى الحقيقة، سنستمر في التقدم إلى الأمام دون تردد!»'
  }
];

export default function LandingHero({ onStartWizard, onLoadProject, lang = 'en' }) {
  const [hoveredCloud, setHoveredCloud] = useState(false);
  const [stats, setStats] = useState({
    totalEpisodes: 0,
    totalProjects: 0,
    totalMovies: 0,
    totalTrailers: 0,
    totalClips: 0,
    totalLines: 0
  });
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Randomly select hero slide on mount or manual click
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * MANGA_HERO_SLIDES.length);
    setCurrentSlideIndex(randomIndex);
  }, []);

  useEffect(() => {
    fetch('/api/dashboard-stats')
      .then(res => res.json())
      .then(data => data.success && setStats(data.stats))
      .catch(err => console.error('Dashboard stats fetch failed:', err));
  }, []);

  const currentSlide = MANGA_HERO_SLIDES[currentSlideIndex];
  const isAr = lang === 'ar';

  return (
    <div className="relative overflow-hidden py-8 sm:py-14">
      
      {/* Background Decorative Manga Accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-sky-500/10 via-purple-500/10 to-transparent pointer-events-none blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* HERO TOP: Clean Title & Fancy Anime Sky Display */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left / Right Column based on RTL: Clean Title & Action */}
          <div className={`lg:col-span-6 space-y-6 text-center ${isAr ? 'lg:text-right' : 'lg:text-left'}`}>
            
            <div className="inline-flex items-center space-x-2 rtl:space-x-reverse bg-purple-950/80 theme-light:bg-purple-700 theme-light:text-white px-4 py-2 rounded-full border border-purple-500/40 theme-light:border-slate-900 text-purple-200 text-xs sm:text-sm font-extrabold shadow-md">
              <Sparkles className="w-4 h-4 text-pink-400 theme-light:text-yellow-300" />
              <span>{isAr ? '第1章 • منصة ترجمة الأنمي المانغا' : '第1章 • Anime Manga Fansub Hub'}</span>
            </div>

            {/* Clean Title */}
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white theme-light:text-slate-950 leading-tight">
              {isAr ? (
                <>ترجمة الأنمي <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-purple-500 to-pink-500">بذكاء وسرعة</span></>
              ) : (
                <>Collaborative <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 via-purple-500 to-pink-500">Anime Fansubbing</span></>
              )}
            </h1>

            <p className={`text-sm sm:text-base text-slate-300 theme-light:text-slate-800 max-w-xl mx-auto ${isAr ? 'lg:mr-0 lg:ml-auto text-right' : 'lg:ml-0 lg:mr-auto text-left'} leading-relaxed font-semibold`}>
              {isAr
                ? 'استخرج ترجمات الأنمي اليابانية بدقة عالية، وقم بتحرير الترجمة الإنجليزية والعربية جنباً إلى جنب مع فريقك.'
                : 'Extract precise Japanese ASR speech timestamps, edit English & Arabic translations side-by-side, and collaborate with your fansub team.'}
            </p>

            <div className={`flex flex-col sm:flex-row items-center justify-center ${isAr ? 'lg:justify-start' : 'lg:justify-start'} gap-4 pt-2`}>
              <button
                onClick={onStartWizard}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:scale-105 transition-all text-white font-extrabold text-sm sm:text-base shadow-xl shadow-purple-500/25 flex items-center justify-center space-x-2 rtl:space-x-reverse group"
              >
                <Wand2 className="w-5 h-5 text-pink-200" />
                <span>{isAr ? 'ابدأ ترجمة الفيديو الآن' : 'Subtie Your Video Now'}</span>
                {isAr ? (
                  <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition" />
                ) : (
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
                )}
              </button>
            </div>
          </div>

          {/* Right / Left Column: Fancy Non-Rectangular Anime Sky Frame */}
          <div className="lg:col-span-6 flex justify-center">
            <div
              className="relative w-full max-w-lg cursor-pointer group"
              onMouseEnter={() => setHoveredCloud(true)}
              onMouseLeave={() => setHoveredCloud(false)}
            >
              {/* Outer Decorative Floating Cloud Elements */}
              <div className="absolute -top-7 -left-7 z-20 text-sky-400 animate-cloud-float pointer-events-none">
                <Cloud className="w-20 h-20 fill-sky-400/20 stroke-sky-400/70" />
              </div>
              <div className="absolute -bottom-6 -right-6 z-20 text-pink-400 animate-cloud-float pointer-events-none" style={{ animationDelay: '1.8s' }}>
                <Cloud className="w-16 h-16 fill-pink-500/20 stroke-pink-400/70" />
              </div>

              {/* FANCY ASYMMETRICAL CLOUD MANGA FRAME */}
              <div className="relative p-3 rounded-[3.5rem] rounded-tr-[1.5rem] rounded-bl-[1.5rem] bg-gradient-to-tr from-sky-400 via-purple-500 to-pink-500 shadow-2xl cloud-frame-shadow transition-all duration-500 group-hover:rotate-1 group-hover:scale-[1.02]">
                
                <div className="relative rounded-[3rem] rounded-tr-[1rem] rounded-bl-[1rem] overflow-hidden bg-slate-950 border-2 border-slate-900 shadow-inner">
                  {/* High Quality Random Anime Image */}
                  <img
                    src={currentSlide.imageUrl}
                    alt="Anime Fantasy Scene"
                    className="w-full aspect-[16/10] object-cover transition-transform duration-700 group-hover:scale-105"
                  />

                  {/* BOLD WHITE SUBTITLE OVERLAY DIRECTLY ON IMAGE WITHOUT BLACK BOX */}
                  <div className="absolute bottom-6 left-4 right-4 z-30 flex items-center justify-center text-center px-2 pointer-events-none">
                    {hoveredCloud ? (
                      <p
                        className="text-base sm:text-lg font-black font-tahoma-arabic leading-snug anime-subtitle-overlay tracking-wide"
                        dir="rtl"
                      >
                        {currentSlide.arabicText}
                      </p>
                    ) : (
                      <p
                        className="text-base sm:text-lg font-black font-mono leading-snug anime-subtitle-overlay tracking-wider"
                      >
                        {currentSlide.japaneseText}
                      </p>
                    )}
                  </div>

                </div>
              </div>

            </div>
          </div>

        </div>

        {/* KNOWLEDGE DASHBOARD STATS: 6 Tiles in One Line */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 pt-6 border-t border-purple-500/20">
          
          {/* Tile 1: Total Episodes Translated */}
          <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-purple-500/20 text-center space-y-2 flex flex-col items-center justify-center transition hover:border-purple-500/50 hover:scale-105 shadow-md">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/20 theme-light:bg-purple-200 border border-purple-500/30 flex items-center justify-center text-purple-400 theme-light:text-purple-800">
              <Tv className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-purple-300 theme-light:text-purple-950 block truncate w-full">
              {isAr ? 'الحلقات المترجمة' : 'Total Episodes'}
            </span>
            <h4 className="text-3xl font-black text-white theme-light:text-purple-950">
              {stats.totalEpisodes || 0}
            </h4>
          </div>

          {/* Tile 2: Total Projects */}
          <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-sky-500/20 text-center space-y-2 flex flex-col items-center justify-center transition hover:border-sky-500/50 hover:scale-105 shadow-md">
            <div className="w-10 h-10 rounded-2xl bg-sky-600/20 theme-light:bg-sky-200 border border-sky-500/30 flex items-center justify-center text-sky-400 theme-light:text-sky-800">
              <FolderKanban className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-sky-300 theme-light:text-sky-950 block truncate w-full">
              {isAr ? 'إجمالي المشاريع' : 'Total Projects'}
            </span>
            <h4 className="text-3xl font-black text-white theme-light:text-sky-950">
              {stats.totalProjects || 0}
            </h4>
          </div>

          {/* Tile 3: Total Movies */}
          <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-pink-500/20 text-center space-y-2 flex flex-col items-center justify-center transition hover:border-pink-500/50 hover:scale-105 shadow-md">
            <div className="w-10 h-10 rounded-2xl bg-pink-600/20 theme-light:bg-pink-200 border border-pink-500/30 flex items-center justify-center text-pink-400 theme-light:text-pink-800">
              <Video className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-pink-300 theme-light:text-pink-950 block truncate w-full">
              {isAr ? 'إجمالي الأفلام' : 'Total Movies'}
            </span>
            <h4 className="text-3xl font-black text-white theme-light:text-pink-950">
              {stats.totalMovies || 0}
            </h4>
          </div>

          {/* Tile 4: Total Trailers */}
          <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-amber-500/20 text-center space-y-2 flex flex-col items-center justify-center transition hover:border-amber-500/50 hover:scale-105 shadow-md">
            <div className="w-10 h-10 rounded-2xl bg-amber-600/20 theme-light:bg-amber-200 border border-amber-500/30 flex items-center justify-center text-amber-400 theme-light:text-amber-800">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-amber-300 theme-light:text-amber-950 block truncate w-full">
              {isAr ? 'العروض الترويجية' : 'Total Trailers'}
            </span>
            <h4 className="text-3xl font-black text-white theme-light:text-amber-950">
              {stats.totalTrailers || 0}
            </h4>
          </div>

          {/* Tile 5: Total Video Clips */}
          <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-indigo-500/20 text-center space-y-2 flex flex-col items-center justify-center transition hover:border-indigo-500/50 hover:scale-105 shadow-md">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 theme-light:bg-indigo-200 border border-indigo-500/30 flex items-center justify-center text-indigo-400 theme-light:text-indigo-800">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-indigo-300 theme-light:text-indigo-950 block truncate w-full">
              {isAr ? 'مقاطع الفيديو' : 'Total Video Clips'}
            </span>
            <h4 className="text-3xl font-black text-white theme-light:text-indigo-950">
              {stats.totalClips || 0}
            </h4>
          </div>

          {/* Tile 6: Total Lines */}
          <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-emerald-500/20 text-center space-y-2 flex flex-col items-center justify-center transition hover:border-emerald-500/50 hover:scale-105 shadow-md">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 theme-light:bg-emerald-200 border border-emerald-500/30 flex items-center justify-center text-emerald-400 theme-light:text-emerald-800">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-emerald-300 theme-light:text-emerald-950 block truncate w-full">
              {isAr ? 'إجمالي الأسطر' : 'Total Subtitle Lines'}
            </span>
            <h4 className="text-3xl font-black text-emerald-400 theme-light:text-emerald-800">
              {stats.totalLines ?? stats.totalTranslatedLines ?? 0}
            </h4>
          </div>

        </div>

      </div>
    </div>
  );
}
