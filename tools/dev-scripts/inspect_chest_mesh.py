import UnityPy

for b in ['279e7931', 'ad531562']:
    env = UnityPy.load(rf'D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\StreamingAssets\SoftRef\Bundles\{b}')
    for obj in env.objects:
        if obj.type.name == 'GameObject':
            d = obj.read()
            if d.m_Name in ['piece_chest', 'piece_chest_wood']:
                print(f"=== {d.m_Name} in {b} ===")
                # Print all child GameObjects
                for child_ptr in getattr(d, 'm_Children', []):
                    try:
                        child = child_ptr.read()
                        print('  child:', child.m_Name)
                    except: pass
