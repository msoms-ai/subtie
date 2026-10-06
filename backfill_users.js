const fs = require('fs');
const path = require('path');
const USERS_FILE = path.join(__dirname, 'server', 'data', 'users.json');

if (fs.existsSync(USERS_FILE)) {
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    let users = {};
    try {
        users = JSON.parse(raw);
    } catch(e) {}
    
    let updated = false;
    for (const userId in users) {
        if (users[userId].minuteBalance === undefined) {
            users[userId].minuteBalance = 35;
            updated = true;
        }
        if (users[userId].hasPurchased === undefined) {
            users[userId].hasPurchased = false;
            updated = true;
        }
    }
    
    if (updated) {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
        console.log("Existing users backfilled with minuteBalance=35 and hasPurchased=false.");
    } else {
        console.log("No users needed backfilling.");
    }
} else {
    console.log("No users.json file found.");
}
