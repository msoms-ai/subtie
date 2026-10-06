import re

with open('server/index.js', 'r') as f:
    code = f.read()

old_register = """      role: 'Translator', // Default role
      isVerified: false,
      verificationCode,
      avatarUrl: '',
      createdAt: new Date().toISOString(),
      subscriptions: { updates: true, newsletter: true, notifications: true },
      preferences: { defaultLanguage: selectedLang, defaultTheme: 'dark' }
    };"""

new_register = """      role: 'Translator', // Default role
      isVerified: false,
      verificationCode,
      avatarUrl: '',
      minuteBalance: 35, // 35 minutes free tier for new users
      hasPurchased: false, // Tracks if user ever made a top-up
      createdAt: new Date().toISOString(),
      subscriptions: { updates: true, newsletter: true, notifications: true },
      preferences: { defaultLanguage: selectedLang, defaultTheme: 'dark' }
    };"""

code = code.replace(old_register, new_register)

with open('server/index.js', 'w') as f:
    f.write(code)

