import React, { useState, useEffect } from 'react';
import { Wand2, Sparkles, Film, ArrowRight, Languages, CheckCircle2, Cloud } from 'lucide-react';

export default function LandingHero({ onStartWizard, onLoadProject, lang = 'en' }) {
  const [hoveredCloud, setHoveredCloud] = useState(false);
  const [stats, setStats] = useState({ totalProjects: 0, totalTranslatedLines: 0, approvedLines: 0 });

  useEffect(() => {
    fetch('/api/dashboard-stats')
      .then(res => res.json())
      .then(data => data.success && setStats(data.stats))
      .catch(err => console.error('Dashboard stats fetch failed:', err));
  }, []);

  const isAr = lang === 'ar';

  return (
    <div className="relative overflow-hidden py-8 sm:py-14">
      
      {/* Background Decorative Manga Accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-purple-500/10 via-pink-500/5 to-transparent pointer-events-none blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* HERO TOP: Clean Title & Redesigned Cloud Frame Video */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: Clean Title & Action */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            
            <div className="inline-flex items-center space-x-2 bg-purple-950/60 theme-light:bg-purple-600 theme-light:text-white px-3.5 py-1.5 rounded-full border border-purple-500/30 theme-light:border-slate-900 text-purple-300 text-xs font-extrabold shadow-sm">
              <Sparkles className="w-4 h-4 text-pink-400 theme-light:text-yellow-300" />
              <span>{isAr ? '第1章 • منصة ترجمة الأنمي المانغا' : '第1章 • Anime Manga Fansub Hub'}</span>
            </div>

            {/* Clean Title */}
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white theme-light:text-slate-900 leading-tight">
              {isAr ? (
                <>ترجمة الأنمي <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400">بذكاء وسرعة</span></>
              ) : (
                <>Collaborative <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500">Anime Fansubbing</span></>
              )}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 theme-light:text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
              {isAr
                ? 'استخرج ترجمات الأنمي اليابانية بدقة عالية، وقم بتحرير الترجمة الإنجليزية والعربية جنباً إلى جنب مع فريقك.'
                : 'Extract precise Japanese ASR speech timestamps, edit English & Arabic translations side-by-side, and collaborate with your fansub team.'}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                onClick={onStartWizard}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:scale-105 transition-all text-white font-bold text-sm sm:text-base shadow-xl shadow-purple-500/25 flex items-center justify-center space-x-2 group"
              >
                <Wand2 className="w-5 h-5 text-pink-200" />
                <span>{isAr ? 'ابدأ ترجمة الفيديو الآن' : 'Subtie Your Video Now'}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
              </button>
            </div>
          </div>

          {/* Right Column: Redesigned Organic Cloud Frame Video Player */}
          <div className="lg:col-span-6 flex justify-center">
            <div
              className="relative w-full max-w-md cursor-pointer group"
              onMouseEnter={() => setHoveredCloud(true)}
              onMouseLeave={() => setHoveredCloud(false)}
            >
              {/* Outer Cloud Decorative Floating Bubbles */}
              <div className="absolute -top-6 -left-6 z-20 text-purple-400/80 animate-cloud-float pointer-events-none">
                <Cloud className="w-16 h-16 fill-purple-500/20 stroke-purple-400/60" />
              </div>
              <div className="absolute -bottom-6 -right-6 z-20 text-pink-400/80 animate-cloud-float pointer-events-none" style={{ animationDelay: '1.5s' }}>
                <Cloud className="w-14 h-14 fill-pink-500/20 stroke-pink-400/60" />
              </div>

              {/* Cloud Card Container */}
              <div className="relative rounded-[2.5rem] bg-gradient-to-tr from-purple-600/30 via-pink-500/20 to-indigo-600/30 p-2 shadow-2xl cloud-frame-shadow border border-purple-500/30">
                <div className="relative rounded-[2rem] overflow-hidden bg-slate-950 border border-slate-800 shadow-inner">
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
                    className="w-full aspect-video object-cover transition-transform duration-700 group-hover:scale-105"
                  />

                  {/* Interactive Floating Anime Subtitle Banner */}
                  <div className="absolute bottom-4 left-4 right-4 z-30 p-3 rounded-2xl bg-slate-950/90 theme-light:bg-white/95 backdrop-blur-md border border-purple-500/40 shadow-2xl transition-all duration-300 transform group-hover:-translate-y-1">
                    
                    <div className="flex items-center justify-between mb-1 text-[10px] font-bold uppercase tracking-wider">
                      <span className="flex items-center space-x-1 text-purple-400 theme-light:text-purple-700">
                        <Languages className="w-3.5 h-3.5 text-pink-400" />
                        <span>{hoveredCloud ? (isAr ? '🇸🇦 الترجمة العربية' : '🇸🇦 Arabic Translation') : (isAr ? '🇯🇵 الصوت الياباني' : '🇯🇵 Original Japanese')}</span>
                      </span>
                      <span className="text-pink-400 text-[9px] bg-pink-950/60 theme-light:bg-pink-100 theme-light:text-pink-700 px-2 py-0.5 rounded-full font-semibold">
                        {hoveredCloud ? (isAr ? 'مُترجم' : 'Translated') : (isAr ? 'مرر للترجمة' : 'Hover to Translate')}
                      </span>
                    </div>

                    {/* Interactive Subtitle Line Transformation */}
                    <div className="min-h-[2.5rem] flex items-center justify-center text-center">
                      {hoveredCloud ? (
                        <p className="text-xs font-bold text-emerald-400 theme-light:text-emerald-700 font-tahoma-arabic leading-normal animate-fade-in" dir="rtl">
                          «سأصبح الرجل الذي ينال لقب ملك القراصنة!»
                        </p>
                      ) : (
                        <p className="text-xs font-bold text-purple-200 theme-light:text-purple-900 font-mono leading-normal animate-fade-in">
                          海賊王に、俺はなる！
                        </p>
                      )}
                    </div>

                  </div>

                </div>
              </div>

            </div>
          </div>

        </div>

        {/* KNOWLEDGE DASHBOARD STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="glass-panel p-5 rounded-3xl border border-purple-500/20 text-center space-y-1">
            <span className="text-xs text-purple-400 theme-light:text-purple-700 font-semibold">{isAr ? 'إجمالي المشاريع' : 'Total Fansub Projects'}</span>
            <h4 className="text-3xl font-extrabold text-white theme-light:text-slate-900">{stats.totalProjects}</h4>
          </div>
          <div className="glass-panel p-5 rounded-3xl border border-purple-500/20 text-center space-y-1">
            <span className="text-xs text-pink-400 theme-light:text-pink-700 font-semibold">{isAr ? 'أسطر الترجمة المستخرجة' : 'Extracted Subtitle Lines'}</span>
            <h4 className="text-3xl font-extrabold text-white theme-light:text-slate-900">{stats.totalTranslatedLines}</h4>
          </div>
          <div className="glass-panel p-5 rounded-3xl border border-purple-500/20 text-center space-y-1">
            <span className="text-xs text-emerald-400 theme-light:text-emerald-700 font-semibold">{isAr ? 'الأسطر المعتمدة' : 'Approved Human Check Lines'}</span>
            <h4 className="text-3xl font-extrabold text-emerald-400 theme-light:text-emerald-600">{stats.approvedLines}</h4>
          </div>
        </div>

      </div>
    </div>
  );
}
