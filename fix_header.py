with open('src/components/Header.jsx', 'r') as f:
    code = f.read()

target = """export default function Header({
  onGoHome,
  onOpenProjects,
  lang = 'en',
  theme = 'dark',
  onToggleLang,
  onToggleTheme,
  user,
  onOpenAuth,
  onOpenProfile,
  onOpenAdminConsole,
  onLogout
}) {"""

replacement = """export default function Header({
  onGoHome,
  onOpenProjects,
  onOpenPricing,
  lang = 'en',
  theme = 'dark',
  onToggleLang,
  onToggleTheme,
  user,
  onOpenAuth,
  onOpenProfile,
  onOpenAdminConsole,
  onLogout
}) {"""

code = code.replace(target, replacement)

with open('src/components/Header.jsx', 'w') as f:
    f.write(code)

print("done")
