import re

with open('src/components/Wizard/LoadVideoWizard.jsx', 'r') as f:
    code = f.read()

state_old = "const [videoDuration, setVideoDuration] = useState('00:00:00');"
state_new = "const [videoDuration, setVideoDuration] = useState('00:00:00');\n  const [videoDurationSecs, setVideoDurationSecs] = useState(0);"

code = code.replace(state_old, state_new)

extract_old = """      const seconds = video.duration;
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      setVideoDuration(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);"""

extract_new = """      const seconds = video.duration;
      setVideoDurationSecs(Math.ceil(seconds));
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      setVideoDuration(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);"""

code = code.replace(extract_old, extract_new)

payload_old = """        body: JSON.stringify({
          projectId,
          projectName: projectName || 'Untitled Project',
          projectType,
          mediaTitle
        })"""

payload_new = """        body: JSON.stringify({
          projectId,
          projectName: projectName || 'Untitled Project',
          projectType,
          mediaTitle,
          videoDurationSecs
        })"""

code = code.replace(payload_old, payload_new)

with open('src/components/Wizard/LoadVideoWizard.jsx', 'w') as f:
    f.write(code)

print("done")
