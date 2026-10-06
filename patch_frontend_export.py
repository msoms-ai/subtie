import re

with open('src/components/Editor/SubtitleWorkspace.jsx', 'r') as f:
    code = f.read()

old_filename_logic = """    const cleanName = String(project?.projectName || 'subtitles').replace(/[/\\\\?%*:|"<>]/g, '_');
    const fileName = `${cleanName}_${exportLang}.${exportFormat}`;"""

new_filename_logic = """    let safeProj = String(project?.projectName || 'Project').replace(/[/\\\\?%*:|"<>]/g, '-').trim();
    let safeEp = String(project?.mediaTitle || 'Episode').replace(/[/\\\\?%*:|"<>]/g, '-').trim();
    safeEp = safeEp.replace(/\.(mp4|mkv|avi|mov|webm)$/i, '');
    const fileName = `[${safeProj}]-[${safeEp}].${exportFormat}`;"""

code = code.replace(old_filename_logic, new_filename_logic)

with open('src/components/Editor/SubtitleWorkspace.jsx', 'w') as f:
    f.write(code)

print("done patching frontend export")
