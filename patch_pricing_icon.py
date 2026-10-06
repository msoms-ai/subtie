import re

with open('src/components/Pricing.jsx', 'r') as f:
    code = f.read()

# Replace import
code = code.replace("Zap, Infinity } from 'lucide-react'", "Zap, ShieldCheck } from 'lucide-react'")

# Replace usage
code = code.replace("<Infinity className=", "<ShieldCheck className=")

with open('src/components/Pricing.jsx', 'w') as f:
    f.write(code)

print("done")
