import React, { useState } from 'react';
import { Crown, Film, Video, Tv, Check, Star, Zap, ShieldCheck, PlaySquare, Clapperboard, Layers } from 'lucide-react';

export default function Pricing({ lang, user }) {
  const isAr = lang === 'ar';
  const isAdmin = user?.role === 'Admin';
  
  const [customMinutes, setCustomMinutes] = useState(500);

  const calculateCustomPrice = (mins) => {
    if (mins === 500) return '$12.99';
    if (mins === 1000) return '$22.99';
    if (mins === 1500) return '$32.99';
    if (mins === 2000) return '$39.99';
    return '$0.00';
  };

  const episodePackages = [
    {
      id: 'ep_single',
      icon: <Tv className="w-8 h-8 text-indigo-400" />,
      title: isAr ? 'حلقة واحدة' : 'Single Episode',
      minutes: 25,
      price: '$0.99',
      color: 'from-indigo-600 to-blue-500',
      features: isAr ? ['يكفي لترجمة حلقة واحدة', 'صلاحية غير محدودة'] : ['Transcribes 1 Episode', 'Unlimited Validity']
    },
    {
      id: 'ep_season',
      icon: <Layers className="w-8 h-8 text-indigo-400" />,
      title: isAr ? 'موسم كامل (12 حلقة)' : 'Full Season (12 Eps)',
      minutes: 300,
      price: '$9.99',
      popular: true,
      color: 'from-indigo-600 to-blue-500',
      features: isAr ? ['توفير ممتاز مقارنة بالحلقة', 'دعم الأنماط المتعددة'] : ['Great savings vs Single', 'Multi-format Support']
    }
  ];

  const moviePackages = [
    {
      id: 'mov_single',
      icon: <Film className="w-8 h-8 text-amber-400" />,
      title: isAr ? 'تذكرة فيلم أنمي' : 'Anime Movie Ticket',
      minutes: 100,
      price: '$2.99',
      color: 'from-amber-500 to-orange-500',
      features: isAr ? ['يكفي لترجمة فيلم كامل', 'جودة عالية للأصوات المعقدة'] : ['Transcribes 1 Full Movie', 'High-Quality Audio parsing']
    },
    {
      id: 'mov_pack',
      icon: <Clapperboard className="w-8 h-8 text-amber-400" />,
      title: isAr ? 'باقة 3 أفلام' : 'Movie Trilogy Pack',
      minutes: 300,
      price: '$8.99',
      color: 'from-amber-500 to-orange-500',
      features: isAr ? ['ترجمة 3 أفلام متكاملة', 'أولوية معالجة عالية'] : ['Transcribes 3 Movies', 'High Priority Processing']
    }
  ];

  const trailerPackages = [
    {
      id: 'tr_single',
      icon: <PlaySquare className="w-8 h-8 text-emerald-400" />,
      title: isAr ? 'مقطع دعائي واحد' : 'Single Trailer',
      minutes: 5,
      price: '$0.25',
      color: 'from-emerald-500 to-teal-500',
      features: isAr ? ['يكفي لفيديو قصير/تريلر', 'معالجة سريعة جداً'] : ['Perfect for AMVs or Trailers', 'Ultra-fast processing']
    },
    {
      id: 'tr_pack',
      icon: <Video className="w-8 h-8 text-emerald-400" />,
      title: isAr ? 'باقة 5 مقاطع' : '5 Trailers Pack',
      minutes: 25,
      price: '$1.00',
      color: 'from-emerald-500 to-teal-500',
      features: isAr ? ['وفر مع باقة المقاطع', 'صلاحية غير محدودة'] : ['Save on multiple clips', 'Unlimited Validity']
    }
  ];

  const renderCard = (pkg) => (
    <div
      key={pkg.id}
      className={`relative rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center bg-slate-900 theme-light:bg-white border-2 transition-all hover:scale-105 hover:shadow-2xl ${
        pkg.popular
          ? 'border-pink-500 shadow-pink-500/20 scale-105 z-10'
          : 'border-slate-800 theme-light:border-slate-200 hover:border-purple-500/50'
      }`}
    >
      {pkg.popular && (
        <div className="absolute -top-4 bg-gradient-to-r from-pink-600 to-rose-500 text-white text-[10px] sm:text-xs font-black px-4 py-1.5 rounded-full shadow-lg flex items-center space-x-1 rtl:space-x-reverse">
          <Star className="w-3.5 h-3.5 fill-current" />
          <span>{isAr ? 'الأكثر طلباً' : 'Most Popular'}</span>
        </div>
      )}

      <div className={`w-14 h-14 rounded-2xl bg-slate-950 theme-light:bg-slate-100 flex items-center justify-center mb-4 shadow-inner`}>
        {pkg.icon}
      </div>

      <h3 className="text-base sm:text-lg font-black text-white theme-light:text-slate-900 mb-2">{pkg.title}</h3>
      
      <div className="flex items-end justify-center space-x-1 rtl:space-x-reverse mb-4">
        <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
          {pkg.price}
        </span>
      </div>

      <div className={`w-full py-2.5 rounded-xl mb-4 bg-gradient-to-r ${pkg.color} bg-opacity-10 border border-white/10`}>
        <span className="text-base font-black text-white flex items-center justify-center space-x-1 rtl:space-x-reverse">
          <span>🪙</span>
          <span>{pkg.minutes} {isAr ? 'دقيقة' : 'Mins'}</span>
        </span>
      </div>

      <ul className="text-[11px] sm:text-xs font-bold text-slate-300 theme-light:text-slate-600 space-y-2 mb-6 w-full text-left rtl:text-right flex-grow">
        {pkg.features.map((feat, idx) => (
          <li key={idx} className="flex items-start space-x-2 rtl:space-x-reverse">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span>{feat}</span>
          </li>
        ))}
      </ul>

      <button
        className={`mt-auto w-full py-3 rounded-xl font-black text-sm text-white transition-all shadow-lg ${
          pkg.popular
            ? 'bg-gradient-to-r from-pink-600 to-rose-500 hover:shadow-pink-500/40'
            : 'bg-slate-800 theme-light:bg-slate-100 theme-light:text-slate-900 hover:bg-slate-700 theme-light:hover:bg-slate-200'
        }`}
      >
        {isAr ? 'شراء' : 'Buy'}
      </button>
    </div>
  );

  return (
    <div className="py-12 sm:py-20 px-4 max-w-7xl mx-auto w-full animate-fade-in-up" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="text-center space-y-4 mb-16">
        <h2 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 glitter-title">
          {isAr ? 'اختر الباقة المناسبة لمشروعك' : 'Choose Your Translation Package'}
        </h2>
        <p className="text-slate-400 text-sm sm:text-lg max-w-2xl mx-auto font-bold">
          {isAr
            ? 'قمنا بتصميم باقات مخصصة تناسب أعمال الفانسب. اشحن رصيدك بمرونة.'
            : 'Tailored packages for Anime Fansubbers. Top up your balance with maximum flexibility.'}
        </p>

        {isAdmin && (
          <div className="mt-6 inline-flex items-center space-x-2 rtl:space-x-reverse bg-gradient-to-r from-rose-600 to-pink-600 px-6 py-3 rounded-full shadow-lg shadow-rose-500/30 border-2 border-rose-400/50">
            <ShieldCheck className="w-5 h-5 text-white" />
            <span className="text-white font-black text-sm">
              {isAr ? 'أنت مدير (Admin): رصيدك غير محدود!' : 'Admin Privilege: You have unlimited minutes!'}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 sm:gap-6 mb-16">
        {/* Episodes */}
        <div className="space-y-4">
          <div className="text-center pb-2 border-b border-purple-500/20">
            <h3 className="text-xl font-black text-indigo-400">{isAr ? 'باقات الحلقات' : 'Episodes'}</h3>
          </div>
          <div className="grid grid-cols-1 gap-6">
            {episodePackages.map(renderCard)}
          </div>
        </div>

        {/* Movies */}
        <div className="space-y-4">
          <div className="text-center pb-2 border-b border-purple-500/20">
            <h3 className="text-xl font-black text-amber-400">{isAr ? 'باقات الأفلام' : 'Movies'}</h3>
          </div>
          <div className="grid grid-cols-1 gap-6">
            {moviePackages.map(renderCard)}
          </div>
        </div>

        {/* Trailers */}
        <div className="space-y-4">
          <div className="text-center pb-2 border-b border-purple-500/20">
            <h3 className="text-xl font-black text-emerald-400">{isAr ? 'المقاطع الدعائية' : 'Trailers & Clips'}</h3>
          </div>
          <div className="grid grid-cols-1 gap-6">
            {trailerPackages.map(renderCard)}
          </div>
        </div>
      </div>

      {/* Custom Minutes Package (Package 4) */}
      <div className="max-w-4xl mx-auto mt-16 p-8 rounded-[2rem] bg-gradient-to-br from-slate-900 to-purple-950 border border-purple-500/30 shadow-2xl shadow-purple-900/40 relative overflow-hidden theme-light:from-purple-50 theme-light:to-pink-50 theme-light:border-purple-200">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1 space-y-4 text-center md:text-left rtl:md:text-right">
            <div className="inline-flex items-center space-x-2 rtl:space-x-reverse bg-purple-500/20 text-purple-300 theme-light:text-purple-700 px-4 py-1.5 rounded-full font-black text-sm">
              <Crown className="w-4 h-4" />
              <span>{isAr ? 'لفرق الترجمة المحترفة' : 'For Pro Fansub Groups'}</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-white theme-light:text-slate-900">
              {isAr ? 'باقة الدقائق المخصصة' : 'Custom Bulk Minutes'}
            </h3>
            <p className="text-slate-400 theme-light:text-slate-600 text-sm font-bold max-w-md mx-auto md:mx-0">
              {isAr ? 'اختر عدد الدقائق الذي تحتاجه بالضبط مع خصومات الحجم الكبيرة.' : 'Select exactly how many minutes you need from the dropdown below with volume discounts.'}
            </p>
          </div>

          <div className="flex flex-col items-center space-y-4 w-full md:w-auto bg-black/40 theme-light:bg-white/60 p-6 rounded-3xl backdrop-blur-sm border border-white/5">
            <label className="text-sm font-black text-slate-300 theme-light:text-slate-700">
              {isAr ? 'اختر كمية الدقائق:' : 'Select Minute Volume:'}
            </label>
            <select
              value={customMinutes}
              onChange={(e) => setCustomMinutes(Number(e.target.value))}
              className="bg-slate-900 theme-light:bg-white text-white theme-light:text-slate-900 border-2 border-purple-500/50 rounded-xl px-4 py-3 font-black text-lg w-full min-w-[200px] focus:outline-none focus:border-pink-500 cursor-pointer"
            >
              <option value={500}>500 {isAr ? 'دقيقة' : 'Mins'}</option>
              <option value={1000}>1,000 {isAr ? 'دقيقة' : 'Mins'}</option>
              <option value={1500}>1,500 {isAr ? 'دقيقة' : 'Mins'}</option>
              <option value={2000}>2,000 {isAr ? 'دقيقة' : 'Mins'}</option>
            </select>

            <div className="flex items-center space-x-4 rtl:space-x-reverse w-full pt-2">
              <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                {calculateCustomPrice(customMinutes)}
              </div>
              <button className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black py-3 rounded-xl shadow-lg transition-all hover:scale-105">
                {isAr ? 'شراء الكمية' : 'Buy Bulk'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
