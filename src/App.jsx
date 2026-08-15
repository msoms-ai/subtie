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

export default function App() {
  const [view, setView] = useState('landing'); // 'landing', 'projects', 'wizard', 'editor'
  const [currentProject, setCurrentProject] = useState(null);

  // App Global Settings (Bilingual & Light/Dark Mode)
  const [lang, setLang] = useState('en'); // 'en' or 'ar'
  const [theme, setTheme] = useState('light'); // 'light' or 'dark'

  // Modal states
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  // Handle shared URL query parameter (?project=id)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('project');

    if (projectId) {
      fetch(`/api/project/${projectId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.project) {
            setCurrentProject(data.project);
            setView('editor');
          }
        })
        .catch(err => console.error('Failed to load shared project:', err));
    }
  }, []);

  const handleStartWizard = () => {
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

  const toggleLang = () => {
    setLang(prev => (prev === 'en' ? 'ar' : 'en'));
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
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
            onEditProject={handleLoadProject}
            onStartWizard={handleStartWizard}
            lang={lang}
          />
        )}

        {view === 'wizard' && (
          <LoadVideoWizard
            onCompleteProcess={handleCompleteProcess}
            onCancel={handleGoHome}
            lang={lang}
          />
        )}

        {view === 'editor' && currentProject && (
          <SubtitleWorkspace
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

      {/* Modals */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} lang={lang} />
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} lang={lang} />
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} lang={lang} />

    </div>
  );
}
