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
import { RefreshCw } from 'lucide-react';

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
          <Pricing lang={lang} user={user} />
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

    </div>
  );
}
