import re

with open('src/components/Wizard/LoadVideoWizard.jsx', 'r') as f:
    code = f.read()

payload_old = """        body: JSON.stringify({
          projectId,
          projectName: projectName || 'Untitled Project',
          projectType,
          mediaTitle: mediaTitle || 'Untitled Video'
        })"""

payload_new = """        body: JSON.stringify({
          projectId,
          projectName: projectName || 'Untitled Project',
          projectType,
          mediaTitle: mediaTitle || 'Untitled Video',
          videoDurationSecs
        })"""

code = code.replace(payload_old, payload_new)

error_old = """      if (!data.success) {
        setIsProcessing(false);
        setErrorMessage(data.message || (isAr ? 'فشلت معالجة الصوت بالذكاء الاصطناعي.' : 'Audio extraction / Gemini AI Processing failed.'));
        return;
      }"""

error_new = """      if (res.status === 402 || res.status === 403) {
        setIsProcessing(false);
        setErrorMessage(data.error || 'Permission denied.');
        return;
      }
      if (!data.success && !data.project) {
        setIsProcessing(false);
        setErrorMessage(data.error || data.message || (isAr ? 'فشلت معالجة الصوت بالذكاء الاصطناعي.' : 'Audio extraction / Gemini AI Processing failed.'));
        return;
      }"""
code = code.replace(error_old, error_new)

with open('src/components/Wizard/LoadVideoWizard.jsx', 'w') as f:
    f.write(code)

print("done")
