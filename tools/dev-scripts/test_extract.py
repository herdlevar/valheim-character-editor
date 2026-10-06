import UnityPy
import os

bundle_path = r"D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\StreamingAssets\SoftRef\Bundles\2c2cce25"
env = UnityPy.load(bundle_path)

output_dir = r"c:\Users\Jared\Documents\antigravity\goofy-einstein\test_icons"
os.makedirs(output_dir, exist_ok=True)

count = 0
for obj in env.objects:
    if obj.type.name in ["Texture2D", "Sprite"]:
        try:
            data = obj.read()
            if hasattr(data, "image") and data.image:
                count += 1
                if count <= 10:
                    fn = os.path.join(output_dir, f"{data.name}.png")
                    data.image.save(fn)
                    print(f"Extracted {data.name} ({data.image.size}) -> {fn}")
        except Exception as e:
            pass

print(f"Total textures/sprites found: {count}")
