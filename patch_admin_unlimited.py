import re

with open('server/index.js', 'r') as f:
    code = f.read()

target = """  // --- Step 2: Backend Credit & Security Check ---
  if (userId !== 'usr_guest') {
    const users = readUsers();
    const user = users[userId];
    if (user) {
      const videoMinutes = Math.ceil((videoDurationSecs || 0) / 60) || 24; // Fallback to 24 mins if undefined
      
      if (videoMinutes > 40 && !user.hasPurchased) {"""

replacement = """  // --- Step 2: Backend Credit & Security Check ---
  if (userId !== 'usr_guest') {
    const users = readUsers();
    const user = users[userId];
    if (user) {
      const videoMinutes = Math.ceil((videoDurationSecs || 0) / 60) || 24; // Fallback to 24 mins if undefined
      const isAdmin = user.role === 'Admin';
      
      if (!isAdmin && videoMinutes > 40 && !user.hasPurchased) {"""

code = code.replace(target, replacement)

target2 = """      if (user.minuteBalance < videoMinutes) {
        return res.status(402).json({ error: `Insufficient credits. You have ${user.minuteBalance} minutes left, but this video requires ${videoMinutes} minutes.` });
      }
      
      // Deduct minutes
      user.minuteBalance -= videoMinutes;
      writeUsers(users);
      console.log(`[Wallet] Deducted ${videoMinutes} mins from user ${userId}. Remaining: ${user.minuteBalance} mins.`);
    }
  }
  // ----------------------------------------------"""

replacement2 = """      if (!isAdmin && user.minuteBalance < videoMinutes) {
        return res.status(402).json({ error: `Insufficient credits. You have ${user.minuteBalance} minutes left, but this video requires ${videoMinutes} minutes.` });
      }
      
      // Deduct minutes (skip for admins)
      if (!isAdmin) {
        user.minuteBalance -= videoMinutes;
        writeUsers(users);
        console.log(`[Wallet] Deducted ${videoMinutes} mins from user ${userId}. Remaining: ${user.minuteBalance} mins.`);
      } else {
        console.log(`[Wallet] Admin ${userId} bypassed minute deduction. Video: ${videoMinutes} mins.`);
      }
    }
  }
  // ----------------------------------------------"""

code = code.replace(target2, replacement2)

with open('server/index.js', 'w') as f:
    f.write(code)

print("done patching admin bypass")
