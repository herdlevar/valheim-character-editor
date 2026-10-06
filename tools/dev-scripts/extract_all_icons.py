import UnityPy, os

output_dir = r"c:\Users\Jared\Documents\antigravity\goofy-einstein\valheim_icons"
os.makedirs(output_dir, exist_ok=True)

# Also let's check both icon bundles: 6a33a62 and 2c2cce25
bundles = [
    r"D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\StreamingAssets\SoftRef\Bundles\6a33a62",
    r"D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\StreamingAssets\SoftRef\Bundles\2c2cce25"
]

saved = set()
for bpath in bundles:
    print(f"Loading bundle {os.path.basename(bpath)}...")
    env = UnityPy.load(bpath)
    for obj in env.objects:
        if obj.type.name in ["Sprite", "Texture2D"]:
            try:
                data = obj.read()
                name = getattr(data, "m_Name", "") or getattr(data, "name", "")
                if name and name not in saved and hasattr(data, "image") and data.image:
                    # Filter for item icons / UI icons
                    img = data.image
                    # Icons are typically 64x64 or 128x128 or 256x256
                    if img.width in [32, 64, 128, 256] and img.height in [32, 64, 128, 256]:
                        fn = os.path.join(output_dir, f"{name}.png")
                        img.save(fn)
                        saved.add(name)
            except Exception as e:
                pass

print(f"Saved {len(saved)} icons to {output_dir}!")
sample = list(saved)[:20]
print("Sample saved:", sample)
