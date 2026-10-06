with open(r'D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\StreamingAssets\SoftRef\manifest_extended', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

import re

# Look at asset locations in manifest_extended
# Example:
# - asset ID: ...
#   bundle: ...
#   path in bundle: Assets/GameElements/Items/_icons/GemstoneGreen.png
matches = re.findall(r'bundle:\s*([a-f0-9]+)\s+path in bundle:\s*([^\r\n]+_icons/[^\r\n]+)', text)
print(f"Found {len(matches)} asset locations matching _icons:")
bundle_counts = {}
for b, p in matches:
    bundle_counts[b] = bundle_counts.get(b, 0) + 1

for b, c in sorted(bundle_counts.items(), key=lambda x: x[1], reverse=True):
    print(f"Bundle {b}: {c} icons (sample: {matches[0][1]})")
