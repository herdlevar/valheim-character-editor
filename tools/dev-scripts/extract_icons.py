import UnityPy
import os

bundle_path = r"D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\StreamingAssets\SoftRef\Bundles\6a33a62"
env = UnityPy.load(bundle_path)

output_dir = r"c:\Users\Jared\Documents\antigravity\goofy-einstein\extracted_icons"
os.makedirs(output_dir, exist_ok=True)

count = 0
for obj in env.objects:
    if obj.type.name in ["Texture2D", "Sprite"]:
        try:
            data = obj.read()
            if hasattr(data, "image") and data.image:
                count += 1
                fn = os.path.join(output_dir, f"{data.name}.png")
                data.image.save(fn)
                if count <= 15:
                    print(f"Extracted {data.name} ({data.image.size})")
        except Exception as e:
            pass

print(f"Total extracted icons: {count}")
