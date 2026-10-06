import UnityPy

env = UnityPy.load(r'D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\StreamingAssets\SoftRef\Bundles\c4210710')

roof_names = []
torch_names = []
chest_names = []

for obj in env.objects:
    if obj.type.name == 'GameObject':
        data = obj.read()
        n = data.name
        nl = n.lower()
        if 'roof' in nl:
            roof_names.append(n)
        if 'torch' in nl:
            torch_names.append(n)
        if 'chest' in nl:
            chest_names.append(n)

print("ROOF GAMEOBJECTS:")
for n in sorted(set(roof_names)):
    print(' ', n)

print("TORCH GAMEOBJECTS:")
for n in sorted(set(torch_names)):
    print(' ', n)

print("CHEST GAMEOBJECTS:")
for n in sorted(set(chest_names)):
    print(' ', n)
