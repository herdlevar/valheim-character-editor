import os, re

icons_dir = r"c:\Users\Jared\Documents\antigravity\goofy-einstein\valheim_icons"
all_icon_files = os.listdir(icons_dir)
# create lookup maps
exact_map = {os.path.splitext(f)[0]: f for f in all_icon_files}
lower_map = {os.path.splitext(f)[0].lower(): f for f in all_icon_files}

with open(r'D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\StreamingAssets\SoftRef\manifest_extended', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

lines = [l.strip().replace('path in bundle: ', '') for l in text.splitlines() if 'Assets/GameElements/Items/' in l and l.endswith('.prefab') and '/_res/' not in l and '/sfx' not in l and '/vfx' not in l]

items = []
for l in lines:
    parts = l.split('/')
    cat = parts[3]
    if cat in ['customizations']: continue
    name = os.path.splitext(parts[-1])[0]
    items.append((name, cat))

matched = 0
unmatched = []

for name, cat in items:
    # 1. exact match
    icon = exact_map.get(name)
    if not icon:
        icon = lower_map.get(name.lower())
    if not icon:
        # try snake_case or stripped
        s1 = re.sub(r'(?<!^)(?=[A-Z])', '_', name).lower()
        icon = lower_map.get(s1)
    if not icon:
        # remove prefix like Armor, Helmet, Cape, Shield, Bow, Axe, Pickaxe, Arrow, etc.
        for prefix in ['Armor', 'Helmet', 'Cape', 'Shield', 'Bow', 'Axe', 'Pickaxe', 'Arrow', 'Mace', 'Sword', 'Spear', 'Atgeir', 'Sledge', 'Knife', 'Staff']:
            if name.startswith(prefix):
                rest = name[len(prefix):]
                cands = [
                    f"{prefix.lower()}_{rest.lower()}",
                    f"{rest.lower()}_{prefix.lower()}",
                    f"{rest.lower()}",
                    f"{name.lower()}"
                ]
                for c in cands:
                    if c in lower_map:
                        icon = lower_map[c]
                        break
            if icon: break

    if icon:
        matched += 1
    else:
        unmatched.append((name, cat))

print(f"Matched {matched} / {len(items)} item icons! ({matched * 100 // len(items)}%)")
if unmatched:
    print(f"Sample unmatched ({len(unmatched)}):", unmatched[:15])
