import re

with open('server/index.js', 'r') as f:
    code = f.read()

old_filename_logic = """  const safeProj = (project.projectName || 'Project').replace(/[/\\\\?%*:|"<>]/g, '-').trim();
  let safeEp = (project.mediaTitle || 'Episode').replace(/[/\\\\?%*:|"<>]/g, '-').trim();
  safeEp = safeEp.replace(/\.(mp4|mkv|avi|mov|webm)$/i, '');
  const filename = `${safeProj}-${safeEp}.${format}`;"""

new_filename_logic = """  const safeProj = (project.projectName || 'Project').replace(/[/\\\\?%*:|"<>]/g, '-').trim();
  let safeEp = (project.mediaTitle || 'Episode').replace(/[/\\\\?%*:|"<>]/g, '-').trim();
  safeEp = safeEp.replace(/\.(mp4|mkv|avi|mov|webm)$/i, '');
  const filename = `[${safeProj}]-[${safeEp}].${format}`;"""

code = code.replace(old_filename_logic, new_filename_logic)

with open('server/index.js', 'w') as f:
    f.write(code)

print("done backend patch")
