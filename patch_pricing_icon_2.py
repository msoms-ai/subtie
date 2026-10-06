import re

with open('src/components/Pricing.jsx', 'r') as f:
    code = f.read()

# Replace import
code = code.replace("CheckCircle2", "Check")

# Replace usage
code = code.replace("<CheckCircle2 className=", "<Check className=")

with open('src/components/Pricing.jsx', 'w') as f:
    f.write(code)

print("done")
