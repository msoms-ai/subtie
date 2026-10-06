import json
import os

users_file = 'server/data/users.json'
if os.path.exists(users_file):
    with open(users_file, 'r') as f:
        users = json.load(f)
    
    updated = False
    for uid, user in users.items():
        if 'minuteBalance' not in user:
            user['minuteBalance'] = 35
            updated = True
        if 'hasPurchased' not in user:
            user['hasPurchased'] = False
            updated = True
            
    if updated:
        with open(users_file, 'w') as f:
            json.dump(users, f, indent=2)
        print("Existing users backfilled.")
    else:
        print("No users needed backfilling.")
else:
    print("users.json not found.")
