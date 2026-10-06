import UnityPy, os

bundle_path = r"D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\StreamingAssets\SoftRef\Bundles\9fe0899c"
output_dir = r"c:\Users\Jared\Documents\antigravity\goofy-einstein\valheim_ui"
os.makedirs(output_dir, exist_ok=True)

env = UnityPy.load(bundle_path)
count = 0
for obj in env.objects:
    if obj.type.name in ["Texture2D", "Sprite"]:
        try:
            data = obj.read()
            name = getattr(data, "m_Name", "") or getattr(data, "name", "")
            if name and hasattr(data, "image") and data.image:
                fn = os.path.join(output_dir, f"{name}.png")
                data.image.save(fn)
                count += 1
                if count <= 15:
                    print(f"Extracted UI: {name} ({data.image.size})")
        except Exception as e:
            pass

print(f"Total UI textures extracted: {count}")
