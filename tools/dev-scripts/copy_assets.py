import os, shutil

base_dir = r"c:\Users\Jared\Documents\antigravity\goofy-einstein"
public_icons = os.path.join(base_dir, "public", "icons")
public_ui = os.path.join(base_dir, "public", "ui")
public_samples = os.path.join(base_dir, "public", "samples")

os.makedirs(public_icons, exist_ok=True)
os.makedirs(public_ui, exist_ok=True)
os.makedirs(public_samples, exist_ok=True)

# Copy icons
src_icons = os.path.join(base_dir, "valheim_icons")
for f in os.listdir(src_icons):
    shutil.copy2(os.path.join(src_icons, f), os.path.join(public_icons, f))
print(f"Copied {len(os.listdir(public_icons))} icons to public/icons")

# Copy UI
src_ui = os.path.join(base_dir, "valheim_ui")
for f in os.listdir(src_ui):
    shutil.copy2(os.path.join(src_ui, f), os.path.join(public_ui, f))
print(f"Copied {len(os.listdir(public_ui))} UI textures to public/ui")

# Copy sample saves
steam_char_dir = r"C:\Program Files (x86)\Steam\userdata\1622853\892970\remote\characters"
for cname in ["knut.fch", "redd.fch", "dire.fch"]:
    src = os.path.join(steam_char_dir, cname)
    if os.path.exists(src):
        shutil.copy2(src, os.path.join(public_samples, cname))
        print(f"Copied sample save {cname} to public/samples")

# Also copy valheim_items.json to src/data/valheimItems.json
src_data = os.path.join(base_dir, "src", "data")
os.makedirs(src_data, exist_ok=True)
shutil.copy2(os.path.join(base_dir, "valheim_items.json"), os.path.join(src_data, "valheimItems.json"))
print("Copied valheim_items.json to src/data/valheimItems.json")
