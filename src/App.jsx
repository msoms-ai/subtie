import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import LandingHero from './components/LandingHero.jsx';
import LoadVideoWizard from './components/Wizard/LoadVideoWizard.jsx';
import SubtitleWorkspace from './components/Editor/SubtitleWorkspace.jsx';
import AboutModal from './components/Modals/AboutModal.jsx';
import ContactModal from './components/Modals/ContactModal.jsx';
import RulesModal from './components/Modals/RulesModal.jsx';

export default function App() {
  const [view, setView] = useState('landing'); // 'landing', 'wizard', 'editor'
  const [currentProject, setCurrentProject] = useState(null);

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

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-['Outfit']">
      
      {/* Header */}
      <Header onGoHome={handleGoHome} />

      {/* Main Content Views */}
      <main className="flex-grow">
        {view === 'landing' && (
          <LandingHero
            onStartWizard={handleStartWizard}
            onLoadProject={handleLoadProject}
          />
        )}

        {view === 'wizard' && (
          <LoadVideoWizard
            onCompleteProcess={handleCompleteProcess}
            onCancel={handleGoHome}
          />
        )}

        {view === 'editor' && currentProject && (
          <SubtitleWorkspace
            initialProject={currentProject}
            onSaveAndClose={handleGoHome}
          />
        )}
      </main>

      {/* Footer */}
      <Footer
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenContact={() => setIsContactOpen(true)}
        onOpenRules={() => setIsRulesOpen(true)}
      />

      {/* Modals */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

    </div>
  );
}
