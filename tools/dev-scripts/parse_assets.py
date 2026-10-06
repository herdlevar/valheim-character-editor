import UnityPy

env = UnityPy.load(r'D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\resources.assets')

prefabs = []
pieces = []

for obj in env.objects:
    if obj.type.name == 'GameObject':
        data = obj.read()
        name = data.name
        prefabs.append(name)
        # Check if it has a Piece component
        has_piece = False
        for comp in data.components:
            # check component type
            try:
                comp_type = comp.type.name
                if comp_type == 'MonoBehaviour':
                    # Read mono behaviour
                    mono = comp.read()
                    if mono.m_Script:
                        script = mono.m_Script.read()
                        if script.name == 'Piece':
                            has_piece = True
                            break
            except Exception:
                pass
        if has_piece:
            pieces.append(name)

print(f"Total GameObjects: {len(prefabs)}")
print(f"Total Pieces: {len(pieces)}")

with open('all_gameobjects.txt', 'w', encoding='utf-8') as f:
    for p in sorted(prefabs):
        f.write(p + '\n')

with open('all_pieces.txt', 'w', encoding='utf-8') as f:
    for p in sorted(pieces):
        f.write(p + '\n')

print("Saved all_gameobjects.txt and all_pieces.txt")
