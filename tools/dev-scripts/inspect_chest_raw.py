import UnityPy

for b in ['279e7931', 'ad531562']:
    env = UnityPy.load(rf'D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\StreamingAssets\SoftRef\Bundles\{b}')
    for obj in env.objects:
        if obj.type.name == 'GameObject':
            d = obj.read()
            if d.m_Name in ['piece_chest', 'piece_chest_wood']:
                print(f"=== {d.m_Name} in {b} ===")
                for c in d.m_Components:
                    try:
                        cr = c.read()
                        tname = cr.type.name if hasattr(cr, 'type') else type(cr).__name__
                        if tname == 'MonoBehaviour':
                            raw = cr.get_raw_data()
                            print('  MonoBehaviour size:', len(raw))
                            # search for string names in raw
                            import re
                            strs = re.findall(rb'[\x20-\x7e]{4,}', raw)
                            print('    strings:', [s.decode('ascii', errors='ignore') for s in strs if not s.startswith(b'm_')])
                    except Exception as e:
                        pass
