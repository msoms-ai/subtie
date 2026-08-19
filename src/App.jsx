import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import LandingHero from './components/LandingHero.jsx';
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
    setCurrentProject(project);
    setView('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoadProject = (project) => {
    setCurrentProject(project);
    setView('editor');
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
        lang={lang}
        theme={theme}
        onToggleLang={toggleLang}
        onToggleTheme={toggleTheme}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenAdminConsole={() => setIsAdminConsoleOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Views */}
      <main className="flex-grow">
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
            onCompleteProcess={handleCompleteProcess}
            onCancel={handleGoHome}
            lang={lang}
          />
        )}

        {view === 'editor' && currentProject && (
          <SubtitleWorkspace
            user={user}
            initialProject={currentProject}
            onSaveAndClose={handleGoHome}
            lang={lang}
          />
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
