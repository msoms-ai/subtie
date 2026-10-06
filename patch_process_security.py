import re

with open('server/index.js', 'r') as f:
    code = f.read()

old_process_header = """app.post('/api/process', async (req, res) => {
  req.setTimeout(0); // Disable timeout for extremely long multi-hour video processing
  res.setTimeout(0);
  const { projectId } = req.body;

  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }

  const projects = readProjects();
  const project = projects[projectId];

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  // Determine user directory path
  const userId = project.ownerId || 'usr_guest';"""

new_process_header = """app.post('/api/process', async (req, res) => {
  req.setTimeout(0); // Disable timeout for extremely long multi-hour video processing
  res.setTimeout(0);
  const { projectId, videoDurationSecs } = req.body;

  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }

  const projects = readProjects();
  const project = projects[projectId];

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const userId = project.ownerId || 'usr_guest';

  // --- Step 2: Backend Credit & Security Check ---
  if (userId !== 'usr_guest') {
    const users = readUsers();
    const user = users[userId];
    if (user) {
      const videoMinutes = Math.ceil((videoDurationSecs || 0) / 60) || 24; // Fallback to 24 mins if undefined
      
      if (videoMinutes > 40 && !user.hasPurchased) {
        return res.status(403).json({ error: 'Free tier is limited to episodes and clips (under 40 mins). Please purchase a package to process movies.' });
      }
      
      if (user.minuteBalance < videoMinutes) {
        return res.status(402).json({ error: `Insufficient credits. You have ${user.minuteBalance} minutes left, but this video requires ${videoMinutes} minutes.` });
      }
      
      // Deduct minutes
      user.minuteBalance -= videoMinutes;
      writeUsers(users);
      console.log(`[Wallet] Deducted ${videoMinutes} mins from user ${userId}. Remaining: ${user.minuteBalance} mins.`);
    }
  }
  // ----------------------------------------------"""

code = code.replace(old_process_header, new_process_header)

with open('server/index.js', 'w') as f:
    f.write(code)

print("done backend patch")
