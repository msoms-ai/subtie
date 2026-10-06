import React from 'react';
import { Crown, Film, Video, Tv, Check, Star, Zap, ShieldCheck } from 'lucide-react';

export default function Pricing({ lang, user }) {
  const isAr = lang === 'ar';
  const isAdmin = user?.role === 'Admin';

  const packages = [
    {
      id: 'single',
      icon: <Tv className="w-8 h-8 text-indigo-400" />,
      title: isAr ? 'حلقة واحدة' : 'Single Episode',
      minutes: 25,
      price: '$0.99',
      color: 'from-indigo-600 to-blue-500',
      features: isAr ? ['يكفي لترجمة حلقة واحدة', 'صلاحية غير محدودة', 'أولوية معالجة عادية'] : ['Transcribes 1 Episode', 'Unlimited Validity', 'Standard Processing']
    },
    {
      id: 'season_1',
      icon: <Video className="w-8 h-8 text-pink-400" />,
      title: isAr ? 'موسم كامل (1-Cour)' : '1-Cour Season Pass',
      minutes: 300,
      price: '$8.99',
      popular: true,
      color: 'from-pink-600 to-rose-500',
      features: isAr ? ['يكفي لترجمة 12 حلقة', 'توفير 25% مقارنة بالحلقة الواحدة', 'دعم الصيغ المتعددة'] : ['Transcribes 12 Episodes', 'Saves 25% vs Singles', 'Multi-format Support']
    },
    {
      id: 'movie',
      icon: <Film className="w-8 h-8 text-amber-400" />,
      title: isAr ? 'تذكرة فيلم أنمي' : 'Anime Movie Ticket',
      minutes: 120,
      price: '$2.99',
      color: 'from-amber-500 to-orange-500',
      features: isAr ? ['يكفي لترجمة فيلم كامل', 'معالجة الأفلام بجودة عالية', 'التعرف على الأصوات المعقدة'] : ['Transcribes 1 Full Movie', 'High-Quality Processing', 'Complex Audio Recognition']
    },
    {
      id: 'whale',
      icon: <Crown className="w-8 h-8 text-purple-400" />,
      title: isAr ? 'باقة الأوتاكو الكبرى' : 'Otaku Whale Pack',
      minutes: 2000,
      price: '$39.99',
      color: 'from-purple-700 to-indigo-600',
      features: isAr ? ['يكفي لترجمة 80 حلقة!', 'أفضل قيمة وتوفير ضخم', 'أولوية معالجة قصوى (VIP)'] : ['Transcribes ~80 Episodes!', 'Massive Bulk Discount', 'VIP Priority Processing']
    }
  ];

  return (
    <div className="py-12 sm:py-20 px-4 max-w-6xl mx-auto w-full animate-fade-in-up" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="text-center space-y-4 mb-16">
        <h2 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 glitter-title">
          {isAr ? 'اختر الباقة المناسبة لمشروعك' : 'Choose Your Translation Package'}
        </h2>
        <p className="text-slate-400 text-sm sm:text-lg max-w-2xl mx-auto font-bold">
          {isAr
            ? 'اشحن رصيد دقائقك حسب احتياج فريقك. لا اشتراكات معقدة، ادفع فقط مقابل ما تحتاج ترجمته.'
            : 'Top up your minute balance based on your teams needs. No subscriptions, just pay for what you transcribe.'}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className={`relative rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center bg-slate-900 theme-light:bg-white border-2 transition-all hover:scale-105 hover:shadow-2xl ${
              pkg.popular
                ? 'border-pink-500 shadow-pink-500/20 scale-105'
                : 'border-slate-800 theme-light:border-slate-200 hover:border-purple-500/50'
            }`}
          >
            {pkg.popular && (
              <div className="absolute -top-4 bg-gradient-to-r from-pink-600 to-rose-500 text-white text-xs font-black px-4 py-1.5 rounded-full shadow-lg flex items-center space-x-1 rtl:space-x-reverse">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{isAr ? 'الأكثر طلباً' : 'Most Popular'}</span>
              </div>
            )}

            <div className={`w-16 h-16 rounded-2xl bg-slate-950 theme-light:bg-slate-100 flex items-center justify-center mb-6 shadow-inner`}>
              {pkg.icon}
            </div>

            <h3 className="text-lg font-black text-white theme-light:text-slate-900 mb-2">{pkg.title}</h3>
            
            <div className="flex items-end justify-center space-x-1 rtl:space-x-reverse mb-6">
              <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                {pkg.price}
              </span>
            </div>

            <div className={`w-full py-3 rounded-xl mb-6 bg-gradient-to-r ${pkg.color} bg-opacity-10 border border-white/10`}>
              <span className="text-xl font-black text-white flex items-center justify-center space-x-1 rtl:space-x-reverse">
                <span>🪙</span>
                <span>{pkg.minutes} {isAr ? 'دقيقة' : 'Mins'}</span>
              </span>
            </div>

            <ul className="text-sm font-bold text-slate-300 theme-light:text-slate-600 space-y-3 mb-8 w-full text-left rtl:text-right">
              {pkg.features.map((feat, idx) => (
                <li key={idx} className="flex items-start space-x-2 rtl:space-x-reverse">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            <button
              className={`mt-auto w-full py-4 rounded-xl font-black text-sm text-white transition-all shadow-lg ${
                pkg.popular
                  ? 'bg-gradient-to-r from-pink-600 to-rose-500 hover:shadow-pink-500/40'
                  : 'bg-slate-800 theme-light:bg-slate-100 theme-light:text-slate-900 hover:bg-slate-700 theme-light:hover:bg-slate-200'
              }`}
            >
              {isAr ? 'شراء الباقة' : 'Buy Package'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
