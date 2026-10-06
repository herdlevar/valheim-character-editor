import UnityPy

env = UnityPy.load(r'D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\StreamingAssets\SoftRef\Bundles\3986cf27')

target_prefabs = ['wood_roof_45', 'wood_roof_top_45', 'wood_wall_roof_45']

for obj in env.objects:
    if obj.type.name == 'GameObject':
        d = obj.read()
        name = getattr(d, 'm_Name', '')
        for tp in target_prefabs:
            if name == tp:
                print(f"==========================================")
                print(f"PREFAB: {name}")
                print(f"==========================================")
                for comp_ptr in d.m_Components:
                    try:
                        c = comp_ptr.read()
                        if 'Transform' in type(c).__name__:
                            for child_ptr in getattr(c, 'm_Children', []):
                                child_t = child_ptr.read()
                                child_go = child_t.m_GameObject.read()
                                c_name = child_go.m_Name
                                pos = (round(child_t.m_LocalPosition.x, 3), round(child_t.m_LocalPosition.y, 3), round(child_t.m_LocalPosition.z, 3))
                                print(f"  Child: {c_name:40} Pos: {pos}")
                    except Exception as e:
                        print('  err:', e)
