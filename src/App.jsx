import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import LandingHero from './components/LandingHero.jsx';
import Pricing from './components/Pricing.jsx';
import ProjectsGallery from './components/Projects/ProjectsGallery.jsx';
import LoadVideoWizard from './components/Wizard/LoadVideoWizard.jsx';
import SubtitleWorkspace from './components/Editor/SubtitleWorkspace.jsx';
import AboutModal from './components/Modals/AboutModal.jsx';
import ContactModal from './components/Modals/ContactModal.jsx';
import RulesModal from './components/Modals/RulesModal.jsx';

import AuthModal from './components/Auth/AuthModal.jsx';
import UserProfileModal from './components/Profile/UserProfileModal.jsx';
import AdminUserConsoleModal from './components/Admin/AdminUserConsoleModal.jsx';
import AssignAuditorModal from './components/Projects/AssignAuditorModal.jsx';
import { RefreshCw, CheckCircle2, XCircle, AlertCircle, Loader2, Sparkles, X } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('landing'); // 'landing', 'projects', 'wizard', 'editor'
  const [currentProject, setCurrentProject] = useState(null);

  // Authenticated user state
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('subtie_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // App Global Settings (Bilingual & Light/Dark Mode)
  const [lang, setLang] = useState(() => user?.preferences?.defaultLanguage || 'ar'); // 'en', 'ar', 'ja'
  const [theme, setTheme] = useState(() => user?.preferences?.defaultTheme || 'dark'); // 'light' or 'dark'

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAdminConsoleOpen, setIsAdminConsoleOpen] = useState(false);
  const [assignAuditorProject, setAssignAuditorProject] = useState(null);

  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [preSelectedFolder, setPreSelectedFolder] = useState('');
  const [paymentModalData, setPaymentModalData] = useState(null); // { status: 'verifying' | 'success' | 'canceled' | 'error', minutesAdded, newBalance, message }

  // Viewed Projects tracking for Header notification badge
  const [viewedProjectIds, setViewedProjectIds] = useState(() => {
    try {
      const saved = localStorage.getItem('subtie_viewed_projects');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [unreadProjectsCount, setUnreadProjectsCount] = useState(0);

  const markProjectAsViewed = useCallback((projectId) => {
    if (!projectId) return;
    setViewedProjectIds(prev => {
      if (prev.includes(projectId)) return prev;
      const updated = [...prev, projectId];
      try {
        localStorage.setItem('subtie_viewed_projects', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

  const refreshUnreadProjects = useCallback(async () => {
    if (!user?.id) {
      setUnreadProjectsCount(0);
      return;
    }
    try {
      const res = await fetch('/api/projects', {
        headers: { 'x-user-id': user.id },
        cache: 'no-store'
      });
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.projects || []);
      const unread = list.filter(p => {
        const isDone = p.processingProgress === 100 || p.status === 'Completed';
        return isDone && !viewedProjectIds.includes(p.id);
      }).length;
      setUnreadProjectsCount(unread);
    } catch (e) {
      console.warn('Failed to refresh unread projects count:', e);
    }
  }, [user?.id, viewedProjectIds]);

  useEffect(() => {
    refreshUnreadProjects();
    const timer = setInterval(refreshUnreadProjects, 10000);
    return () => clearInterval(timer);
  }, [refreshUnreadProjects]);

  // Persist user state & preferences
  useEffect(() => {
    if (user) {
      localStorage.setItem('subtie_user', JSON.stringify(user));
      if (user.preferences?.defaultLanguage) setLang(user.preferences.defaultLanguage);
      if (user.preferences?.defaultTheme) setTheme(user.preferences.defaultTheme);
    } else {
      localStorage.removeItem('subtie_user');
    }
  }, [user]);

  // Handle shared URL query parameter (?project=id)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('project');

    if (projectId) {
      fetch(`/api/project/${projectId}`)
        .then(res => res.json())
        .then(data => {
          if (data.id) {
            setCurrentProject(data);
            setView('editor');
          }
        })
        .catch(err => console.error('Failed to load shared project:', err));
    }
  }, []);

  // Handle Ziina Payment Callback (?payment_status=success/cancel&payment_intent_id=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment_status');
    const paymentIntentId = params.get('payment_intent_id');

    if (!paymentStatus && !paymentIntentId) return;

    if (paymentStatus === 'cancel') {
      setPaymentModalData({
        status: 'canceled',
        message: lang === 'ar' ? 'تم إلغاء عملية الدفع، لم يتم خصم أي مبالغ من حسابك.' : 'Payment was canceled. No charges were made.'
      });
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (paymentIntentId) {
      setPaymentModalData({
        status: 'verifying',
        message: lang === 'ar' ? 'جاري التحقق من عملية الدفع عبر بوابة Ziina وتحديث رصيد الدقائق...' : 'Verifying payment with Ziina and updating your minutes...'
      });

      fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.status === 'completed') {
            setPaymentModalData({
              status: 'success',
              minutesAdded: data.minutesAdded,
              newBalance: data.minuteBalance,
              packageTitleAr: data.packageTitleAr,
              packageTitleEn: data.packageTitleEn
            });

            // Update user state and local storage immediately
            setUser(prev => {
              if (!prev) return prev;
              const updated = { ...prev, minuteBalance: data.minuteBalance, hasPurchased: true };
              localStorage.setItem('subtie_user', JSON.stringify(updated));
              return updated;
            });
          } else {
            setPaymentModalData({
              status: 'error',
              message: data.message || data.error || (lang === 'ar' ? 'تعذر التحقق من نجاح عملية الدفع.' : 'Could not verify payment intent.')
            });
          }
        })
        .catch(err => {
          console.error('Payment verification failed:', err);
          setPaymentModalData({
            status: 'error',
            message: lang === 'ar' ? 'خطأ في الاتصال أثناء التحقق من الدفع.' : 'Network error verifying payment.'
          });
        })
        .finally(() => {
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    }
  }, [lang]);

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    setIsAuthOpen(false);
  };

  const handleUpdateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const handleLogout = () => {
    setUser(null);
    setIsProfileOpen(false);
    setIsAdminConsoleOpen(false);
    setView('landing');
  };

  const handleStartWizard = () => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    setView('wizard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenProjects = () => {
    setView('projects');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCompleteProcess = (project) => {
    if (project && project.id) {
      setCurrentProject(project);
      markProjectAsViewed(project.id);
      setView('editor');
    } else {
      setView('projects');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoadProject = (project) => {
    if (project && project.id) {
      setCurrentProject(project);
      markProjectAsViewed(project.id);
      setView('editor');
    } else {
      setView('projects');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoHome = () => {
    setView('landing');
    setCurrentProject(null);
    window.history.pushState({}, '', window.location.pathname);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleLang = (explicitLang) => {
    if (typeof explicitLang === 'string') {
      setLang(explicitLang);
    } else {
      setLang(prev => (prev === 'en' ? 'ar' : 'en'));
    }
  };

  const toggleTheme = (explicitTheme) => {
    if (typeof explicitTheme === 'string') {
      setTheme(explicitTheme);
    } else {
      setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
    }
  };

  const isAr = lang === 'ar';
  const isLight = theme === 'light';

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className={`min-h-screen flex flex-col font-['Outfit'] transition-colors duration-300 ${
        isLight ? 'theme-light bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'
      }`}
    >
      
      {/* Header */}
      <Header
        onGoHome={handleGoHome}
        onOpenProjects={handleOpenProjects}
        onStartWizard={handleStartWizard}
        onOpenPricing={() => { setView('pricing'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        lang={lang}
        theme={theme}
        onToggleLang={toggleLang}
        onToggleTheme={toggleTheme}
        user={user}
        unreadProjectsCount={unreadProjectsCount}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenAdminConsole={() => setIsAdminConsoleOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Views */}
      <main className="flex-grow">
        {view === 'pricing' && (
          <Pricing lang={lang} user={user} onRequireAuth={() => setIsAuthOpen(true)} />
        )}

        {view === 'landing' && (
          <LandingHero
            onStartWizard={handleStartWizard}
            onLoadProject={handleLoadProject}
            lang={lang}
          />
        )}

        {view === 'projects' && (
          <ProjectsGallery
            user={user}
            onEditProject={handleLoadProject}
            onStartWizard={handleStartWizard}
            onOpenAssignAuditor={(proj) => setAssignAuditorProject(proj)}
            lang={lang}
          />
        )}

        {view === 'wizard' && (
          <LoadVideoWizard
            user={user}
            initialProjectName={preSelectedFolder}
            onCompleteProcess={(project) => {
              handleCompleteProcess(project);
              setPreSelectedFolder('');
            }}
            onCancel={() => {
              handleGoHome();
              setPreSelectedFolder('');
            }}
            lang={lang}
          />
        )}

        {view === 'editor' && (
          currentProject ? (
            <SubtitleWorkspace
              user={user}
              initialProject={currentProject}
              onSaveAndClose={() => setView('projects')}
              onAddAnotherEpisode={() => {
                setPreSelectedFolder(currentProject.projectName || '');
                setView('wizard');
              }}
              lang={lang}
            />
          ) : (
            <div className="max-w-md mx-auto my-20 p-8 glass-panel rounded-3xl border border-purple-500/30 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-900/50 border border-purple-500/40 flex items-center justify-center mx-auto text-purple-300">
                <RefreshCw className="w-6 h-6 animate-spin text-pink-400" />
              </div>
              <h3 className="text-base font-black text-white">
                {isAr ? 'جاري تحميل المشروع...' : 'Loading Project...'}
              </h3>
              <p className="text-xs text-slate-400">
                {isAr ? 'إذا لم يفتح المحرر تلقائياً، يمكنك العودة لقائمة المشاريع.' : 'If the workspace does not open automatically, return to your projects.'}
              </p>
              <button
                onClick={() => setView('projects')}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black transition shadow-md"
              >
                {isAr ? 'الذهاب إلى مشاريعي' : 'Go to My Projects'}
              </button>
            </div>
          )
        )}
      </main>

      {/* Footer */}
      <Footer
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenContact={() => setIsContactOpen(true)}
        onOpenRules={() => setIsRulesOpen(true)}
        lang={lang}
      />

      {/* Auth & Profile Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        lang={lang}
      />

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        onUpdateUser={handleUpdateUser}
        lang={lang}
        theme={theme}
        onToggleTheme={toggleTheme}
        onChangeLang={toggleLang}
      />

      <AdminUserConsoleModal
        isOpen={isAdminConsoleOpen}
        onClose={() => setIsAdminConsoleOpen(false)}
        currentUser={user}
        lang={lang}
      />

      <AssignAuditorModal
        isOpen={!!assignAuditorProject}
        onClose={() => setAssignAuditorProject(null)}
        project={assignAuditorProject}
        currentUser={user}
        onAssignedSuccess={() => handleOpenProjects()}
        lang={lang}
      />

      {/* Legacy Modals */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} lang={lang} />
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} lang={lang} />
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} lang={lang} />

      {/* Ziina Payment Status & Celebration Modal */}
      {paymentModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="relative w-full max-w-md p-6 sm:p-8 rounded-[2rem] bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-purple-500/40 shadow-2xl shadow-purple-950/60 text-center space-y-5">
            <button
              onClick={() => setPaymentModalData(null)}
              className="absolute top-4 right-4 rtl:right-auto rtl:left-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {paymentModalData.status === 'verifying' && (
              <div className="py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-purple-900/50 border-2 border-purple-400/50 flex items-center justify-center mx-auto text-pink-400 shadow-xl">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
                <h3 className="text-lg font-black text-white">
                  {isAr ? 'جاري التحقق من عملية الدفع...' : 'Verifying Payment...'}
                </h3>
                <p className="text-xs text-slate-400 font-bold max-w-xs mx-auto">
                  {paymentModalData.message}
                </p>
              </div>
            )}

            {paymentModalData.status === 'success' && (
              <div className="py-2 space-y-4">
                <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center mx-auto text-white shadow-2xl shadow-emerald-500/30">
                  <CheckCircle2 className="w-10 h-10" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center text-slate-950 shadow-md">
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-500/30">
                    {isAr ? 'تم الدفع بنجاح عبر Ziina' : 'Payment Completed via Ziina'}
                  </span>
                  <h3 className="text-2xl font-black text-white pt-2">
                    {isAr ? '🎉 مبروك! تم شحن رصيدك' : '🎉 Payment Successful!'}
                  </h3>
                </div>

                <div className="p-4 rounded-2xl bg-purple-950/60 border border-purple-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span>{isAr ? 'الدقائق المضافة:' : 'Minutes Added:'}</span>
                    <span className="text-emerald-400 font-black text-sm">+{paymentModalData.minutesAdded} {isAr ? 'دقيقة' : 'mins'}</span>
                  </div>
                  <div className="h-px bg-purple-500/20" />
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span>{isAr ? 'الرصيد الكلي الحالي:' : 'New Total Balance:'}</span>
                    <span className="text-yellow-400 font-black text-base flex items-center space-x-1 rtl:space-x-reverse">
                      <span>🪙</span>
                      <span>{paymentModalData.newBalance} {isAr ? 'دقيقة' : 'mins'}</span>
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => {
                      setPaymentModalData(null);
                      handleStartWizard();
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white font-black text-xs sm:text-sm shadow-lg hover:opacity-95 transition cursor-pointer"
                  >
                    {isAr ? 'ابدأ ترجمة فيديو جديد' : 'Start New Project'}
                  </button>
                  <button
                    onClick={() => {
                      setPaymentModalData(null);
                      handleOpenProjects();
                    }}
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs sm:text-sm transition cursor-pointer"
                  >
                    {isAr ? 'مشاريعي' : 'My Projects'}
                  </button>
                </div>
              </div>
            )}

            {paymentModalData.status === 'canceled' && (
              <div className="py-4 space-y-4">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400/40 flex items-center justify-center mx-auto text-amber-400 shadow-xl">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-white">
                  {isAr ? 'تم إلغاء عملية الدفع' : 'Payment Canceled'}
                </h3>
                <p className="text-xs text-slate-400 font-bold max-w-xs mx-auto">
                  {paymentModalData.message}
                </p>
                <button
                  onClick={() => setPaymentModalData(null)}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs transition cursor-pointer"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
              </div>
            )}

            {paymentModalData.status === 'error' && (
              <div className="py-4 space-y-4">
                <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-400/40 flex items-center justify-center mx-auto text-rose-400 shadow-xl">
                  <XCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-white">
                  {isAr ? 'فشل التحقق من الدفع' : 'Payment Verification Failed'}
                </h3>
                <p className="text-xs text-rose-300 font-bold max-w-xs mx-auto">
                  {paymentModalData.message}
                </p>
                <button
                  onClick={() => setPaymentModalData(null)}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs transition cursor-pointer"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
