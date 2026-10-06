with open(r'D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\resources.assets', 'rb') as f:
    data = f.read()

import re
matches = re.findall(rb'"(piece_chest[^"]*)","([^"]*)"', data)
for m in sorted(set(matches)):
    print(f"{m[0].decode('utf-8', errors='ignore'):30} -> {m[1].decode('utf-8', errors='ignore')}")
