import React, { useState, useEffect } from 'react';
import { Wand2, Play, Sparkles, Film, ArrowRight, Languages, CheckCircle2, Clock } from 'lucide-react';

export default function LandingHero({ onStartWizard, onLoadProject, lang = 'en' }) {
  const [hoveredCloud, setHoveredCloud] = useState(false);
  const [stats, setStats] = useState({ totalProjects: 0, totalTranslatedLines: 0, approvedLines: 0 });
  const [recentProjects, setRecentProjects] = useState([]);

  useEffect(() => {
    fetch('/api/dashboard-stats')
      .then(res => res.json())
      .then(data => data.success && setStats(data.stats))
      .catch(err => console.error('Dashboard stats fetch failed:', err));

    fetch('/api/projects')
      .then(res => res.json())
      .then(data => data.success && setRecentProjects((data.projects || []).slice(0, 3)))
      .catch(err => console.error('Projects fetch failed:', err));
  }, []);

  const isAr = lang === 'ar';

  return (
    <div className="relative overflow-hidden py-10 sm:py-16">
      
      {/* Background Decorative Manga Accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-purple-500/10 via-pink-500/5 to-transparent pointer-events-none blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* HERO TOP: Clean Title & Cloud-Masked Video Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: Clean Title & Action */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            
            <div className="inline-flex items-center space-x-2 bg-purple-950/60 theme-light:bg-purple-100 px-3.5 py-1.5 rounded-full border border-purple-500/30 text-purple-300 theme-light:text-purple-700 text-xs font-bold">
              <Sparkles className="w-4 h-4 text-pink-400" />
              <span>{isAr ? 'منصة الترجمة التشاركية للأنمي' : 'Collaborative Anime Fansubbing'}</span>
            </div>

            {/* Clean Short Title */}
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
              {isAr ? (
                <>ترجمة الأنمي <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400">بذكاء وسرعة</span></>
              ) : (
                <>Collaborative <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400">Anime Fansubbing</span></>
              )}
            </h1>

            <p className="text-base text-slate-300 theme-light:text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              {isAr
                ? 'استخرج ترجمات الأنمي اليابانية بدقة عالية، وقم بتحرير الترجمة الإنجليزية والعربية جنباً إلى جنب مع فريقك.'
                : 'Extract precise Japanese ASR speech timestamps, edit English & Arabic translations side-by-side, and collaborate with your fansub team.'}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                onClick={onStartWizard}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:scale-105 transition-all text-white font-bold text-base shadow-xl shadow-purple-500/25 flex items-center justify-center space-x-2 group"
              >
                <Wand2 className="w-5 h-5 text-pink-200" />
                <span>{isAr ? 'ابدأ ترجمة الفيديو الآن' : 'Subtie Your Video Now'}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
              </button>
            </div>
          </div>

          {/* Right Column: Cloud-Masked Video Preview with Subtitle Hover Transformation */}
          <div className="lg:col-span-6 flex justify-center">
            <div
              className="relative w-full max-w-md aspect-[4/3] flex items-center justify-center cursor-pointer group"
              onMouseEnter={() => setHoveredCloud(true)}
              onMouseLeave={() => setHoveredCloud(false)}
            >
              {/* Cloud Glow Background */}
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/30 to-pink-500/30 rounded-full blur-2xl group-hover:scale-110 transition duration-500" />

              {/* Cloud-Masked Video Frame */}
              <div className="relative w-full h-full cloud-mask-container bg-slate-900 border border-purple-500/30 shadow-2xl overflow-hidden flex items-center justify-center">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
                  className="w-full h-full object-cover scale-110"
                />

                {/* Floating Interactive Subtitle Badge over Cloud Video */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-slate-950/90 text-white px-5 py-2.5 rounded-2xl border border-purple-500/40 shadow-2xl transition-all duration-500 flex items-center space-x-2 text-center max-w-[85%]">
                  <Languages className="w-4 h-4 text-pink-400 shrink-0" />
                  <span className="text-xs font-bold transition-all duration-500">
                    {hoveredCloud ? (
                      <span className="text-emerald-300 font-tahoma-arabic" dir="rtl">
                        «مرحباً بكم في منصة ترجمة الأنمي الفريدة»
                      </span>
                    ) : (
                      <span className="text-purple-300 font-mono">
                        アニメの字幕へようこそ！ (Hover to Translate)
                      </span>
                    )}
                  </span>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* KNOWLEDGE DASHBOARD STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
          <div className="glass-panel p-5 rounded-3xl border border-purple-500/20 text-center space-y-1">
            <span className="text-xs text-purple-300 font-medium">{isAr ? 'إجمالي المشاريع' : 'Total Fansub Projects'}</span>
            <h4 className="text-3xl font-extrabold text-white">{stats.totalProjects}</h4>
          </div>
          <div className="glass-panel p-5 rounded-3xl border border-purple-500/20 text-center space-y-1">
            <span className="text-xs text-pink-300 font-medium">{isAr ? 'أسطر الترجمة المستخرجة' : 'Extracted Subtitle Lines'}</span>
            <h4 className="text-3xl font-extrabold text-white">{stats.totalTranslatedLines}</h4>
          </div>
          <div className="glass-panel p-5 rounded-3xl border border-purple-500/20 text-center space-y-1">
            <span className="text-xs text-emerald-300 font-medium">{isAr ? 'الأسطر المعتمدة' : 'Approved Human Check Lines'}</span>
            <h4 className="text-3xl font-extrabold text-emerald-400">{stats.approvedLines}</h4>
          </div>
        </div>

      </div>
    </div>
  );
}
