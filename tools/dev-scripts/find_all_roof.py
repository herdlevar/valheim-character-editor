import os, re

valheim_root = r'D:\SteamLibrary\steamapps\common\Valheim'
for root, dirs, files in os.walk(valheim_root):
    for f in files:
        if f.endswith('.log') or f.endswith('.txt') or f.endswith('.json'):
            continue
        p = os.path.join(root, f)
        sz = os.path.getsize(p)
        # Search for b'piece_woodwall' in file
        try:
            with open(p, 'rb') as fp:
                data = fp.read()
                # Check for piece_woodwall and piece_woodroof45
                if b'piece_woodroof45' in data:
                    print(f"Found piece_woodroof45 in: {p} ({sz} bytes)")
        except Exception:
            pass
