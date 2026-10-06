import UnityPy, os

# Let's search all asset files in StreamingAssets and valheim_Data for PieceTable
search_dirs = [
    r'D:\SteamLibrary\steamapps\common\Valheim\valheim_Data',
    r'D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\StreamingAssets\SoftRef\Bundles'
]

found = []
for d in search_dirs:
    for f in os.listdir(d):
        p = os.path.join(d, f)
        if os.path.isfile(p) and os.path.getsize(p) < 10000000:
            try:
                env = UnityPy.load(p)
                for obj in env.objects:
                    if obj.type.name == 'MonoBehaviour':
                        d_obj = obj.read()
                        if hasattr(d_obj, 'm_Script') and d_obj.m_Script:
                            s = d_obj.m_Script.read()
                            if s.m_Name == 'PieceTable':
                                print(f"Found PieceTable in {f}: {getattr(d_obj, 'm_Name', 'unnamed')}")
                                found.append((f, obj))
            except: pass

print(f"Total PieceTables found: {len(found)}")
