import re

with open('src/App.jsx', 'r') as f:
    code = f.read()

import_target = "import LandingHero from './components/LandingHero.jsx';"
import_replacement = "import LandingHero from './components/LandingHero.jsx';\nimport Pricing from './components/Pricing.jsx';"
code = code.replace(import_target, import_replacement)

header_target = """      {/* Header */}
      <Header
        onGoHome={handleGoHome}
        onOpenProjects={handleOpenProjects}
        onStartWizard={handleStartWizard}"""

header_replacement = """      {/* Header */}
      <Header
        onGoHome={handleGoHome}
        onOpenProjects={handleOpenProjects}
        onStartWizard={handleStartWizard}
        onOpenPricing={() => { setView('pricing'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}"""
code = code.replace(header_target, header_replacement)

view_target = """        {view === 'landing' && (
          <LandingHero"""

view_replacement = """        {view === 'pricing' && (
          <Pricing lang={lang} user={user} />
        )}

        {view === 'landing' && (
          <LandingHero"""
code = code.replace(view_target, view_replacement)

with open('src/App.jsx', 'w') as f:
    f.write(code)

print("done patching app pricing")
