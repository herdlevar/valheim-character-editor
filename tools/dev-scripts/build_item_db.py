import os, re, json

def get_stable_hash_code(s):
    def int32(x):
        x = x & 0xFFFFFFFF
        return x if x < 0x80000000 else x - 0x100000000
    num1 = 5381
    num2 = num1
    i = 0
    n = len(s)
    while i < n and ord(s[i]) != 0:
        c1 = ord(s[i])
        num1 = int32(int32(int32(num1 << 5) + num1) ^ c1)
        if i == n - 1 or ord(s[i + 1]) == 0: break
        c2 = ord(s[i + 1])
        num2 = int32(int32(int32(num2 << 5) + num2) ^ c2)
        i += 2
    return int32(num1 + int32(num2 * 1566083941))

# Read icons directory
icons_dir = r"c:\Users\Jared\Documents\antigravity\goofy-einstein\valheim_icons"
all_icon_files = os.listdir(icons_dir)
exact_icon_map = {os.path.splitext(f)[0]: f for f in all_icon_files}
lower_icon_map = {os.path.splitext(f)[0].lower(): f for f in all_icon_files}

# Known special icon renames
SPECIAL_ICONS = {
    "ChickenEgg": "egg.png",
    "RottenMeat": "meat_rotten.png",
    "Hammer": "hammer.png",
    "Hoe": "hoe.png",
    "Torch": "groundtorch.png",
    "AxeBronze": "axe_bronze.png",
    "AxeFlint": "axe_flint.png",
    "AxeIron": "axe_iron.png",
    "AxeBlackMetal": "axe_blackmetal.png",
    "PickaxeIron": "pickaxe_iron.png",
    "PickaxeBronze": "pickaxe_bronze.png",
    "PickaxeAntler": "pickaxe_antler.png",
    "PickaxeStone": "pickaxe_stone.png",
    "BowHuntsman": "bow_huntsman.png",
    "BowFineWood": "bow_finewood.png",
    "ArrowFlint": "arrow_flint.png",
    "ArrowIron": "arrow_iron.png",
    "ArrowSilver": "arrow_silver.png",
    "ArrowBronze": "arrow_bronze.png",
    "ArrowWood": "arrow_wood.png",
    "ArrowFire": "arrow_fire.png",
    "ArrowPoison": "arrow_poison.png",
    "ArrowFrost": "arrow_frost.png",
    "ShieldBanded": "shield_banded0.png",
    "ShieldBronzeBuckler": "shield_bronze_buckler.png",
    "ShieldWood": "shield_wood0.png",
    "ShieldIronTower": "shield_irontower0.png",
    "CookedDeerMeat": "deer_meat_cooked.png",
    "DeerMeat": "deer_meat.png",
    "CookedBoarMeat": "meat_cooked.png",
    "BoarMeat": "rawmeat.png",
    "MeadPoisonResist": "potion_poisonresist.png",
    "MeadFrostResist": "potion_frostresist.png",
    "MeadHealthMedium": "potion_health_medium.png",
    "MeadHealthMinor": "potion_health_minor.png",
    "MeadStaminaMinor": "potion_stamina_minor.png",
    "MeadStaminaMedium": "potion_stamina_medium.png",
    "FineWood": "finewood.png",
    "RoundLog": "roundlog.png",
    "Wood": "wood.png",
    "Stone": "stone.png",
    "Iron": "iron.png",
    "IronScrap": "ironscrap.png",
    "Copper": "copper.png",
    "Tin": "tin.png",
    "Bronze": "bronze.png",
    "Silver": "silver.png",
    "BlackMetal": "blackmetal.png",
    "Flametal": "flametal.png",
    "DeerHide": "deerhide.png",
    "Resin": "resin.png",
    "BronzeNails": "bronzenails.png",
    "IronNails": "ironnails.png",
    "Coins": "coins.png",
    "Ruby": "ruby.png",
    "Amber": "amber.png",
    "AmberPearl": "amberpearl.png",
    "SilverNecklace": "silvernecklace.png",
    "HelmetRoot": "HelmetRoot.png",
    "ArmorRootChest": "ArmorRootChest.png",
    "ArmorRootLegs": "ArmorRootLegs.png",
    "CapeTrollHide": "CapeTrollHide.png",
    "BeltStrength": "BeltStrength.png",
    "Wishbone": "Wishbone.png",
    "MaceIron": "MaceIron.png",
    "SwordIron": "SwordIron.png",
    "Honey": "honey.png",
}

def find_icon(prefab):
    if prefab in SPECIAL_ICONS and SPECIAL_ICONS[prefab] in all_icon_files:
        return SPECIAL_ICONS[prefab]
    if prefab in exact_icon_map:
        return exact_icon_map[prefab]
    
    p_lower = prefab.lower()
    if p_lower in lower_icon_map:
        return lower_icon_map[p_lower]
        
    # Singular check
    if p_lower.endswith('s') and p_lower[:-1] in lower_icon_map:
        return lower_icon_map[p_lower[:-1]]
        
    # Pickable prefix
    if p_lower.startswith('pickable_'):
        rest = p_lower[9:]
        if rest in lower_icon_map: return lower_icon_map[rest]
        if rest.endswith('s') and rest[:-1] in lower_icon_map: return lower_icon_map[rest[:-1]]

    # Try snake case
    snake = re.sub(r'(?<!^)(?=[A-Z])', '_', prefab).lower()
    if snake in lower_icon_map:
        return lower_icon_map[snake]
        
    # Generic Cooked Meat fallback
    if "cooked" in p_lower and ("meat" in p_lower or "serpent" in p_lower):
        if "chicken" not in p_lower: # keep chicken_meat_cooked distinct
            return "Meat.png"
    
    # Try removing prefixes / suffixes
    prefixes = ['Armor', 'Helmet', 'Cape', 'Shield', 'Bow', 'Axe', 'Pickaxe', 'Arrow', 'Mace', 'Sword', 'Spear', 'Atgeir', 'Sledge', 'Knife', 'Staff', 'Trophy', 'Mead', 'Cooked']
    for p in prefixes:
        if prefab.startswith(p):
            rest = prefab[len(p):]
            rest_snake = re.sub(r'(?<!^)(?=[A-Z])', '_', rest).lower()
            cands = [
                f"{p.lower()}_{rest.lower()}",
                f"{rest.lower()}_{p.lower()}",
                f"{p.lower()}_{rest_snake}",
                f"{rest_snake}_{p.lower()}",
                f"{rest.lower()}",
                f"{rest}",
                f"{rest_snake}",
                f"{p.lower()}{rest.lower()}"
            ]
            for c in cands:
                if c in lower_icon_map:
                    return lower_icon_map[c]
                if c in exact_icon_map:
                    return exact_icon_map[c]
    return ""

def format_display_name(prefab):
    # Special clean names
    SPECIAL_NAMES = {
        "BeltStrength": "Megingjord",
        "Wishbone": "Wishbone",
        "ArmorRootChest": "Root Harnesk",
        "ArmorRootLegs": "Root Leggings",
        "HelmetRoot": "Root Mask",
        "CapeTrollHide": "Troll Hide Cape",
        "TrinketBronzeStamina": "Bronze Stamina Trinket",
        "FineWood": "Fine Wood",
        "RoundLog": "Core Wood",
        "BronzeNails": "Bronze Nails",
        "IronNails": "Iron Nails",
        "CookedDeerMeat": "Cooked Deer Meat",
        "CookedBoarMeat": "Cooked Boar Meat",
        "MeadPoisonResist": "Poison Resistance Mead",
        "MeadFrostResist": "Frost Resistance Mead",
        "MeadHealthMinor": "Minor Healing Mead",
        "MeadHealthMedium": "Medium Healing Mead",
        "MeadStaminaMinor": "Minor Stamina Mead",
        "MeadStaminaMedium": "Medium Stamina Mead",
        "ShieldBanded": "Banded Shield",
        "BowHuntsman": "Huntsman Bow",
        "PickaxeIron": "Iron Pickaxe",
        "PickaxeBronze": "Bronze Pickaxe",
        "PickaxeAntler": "Antler Pickaxe",
        "AxeBronze": "Bronze Axe",
        "MaceIron": "Iron Mace",
        "SwordIron": "Iron Sword",
    }
    if prefab in SPECIAL_NAMES:
        return SPECIAL_NAMES[prefab]
    
    # Clean up prefixes
    name = prefab
    if name.startswith("Armor") and ("Chest" in name or "Legs" in name):
        match = re.match(r'Armor(.*)(Chest|Legs)', name)
        if match:
            mat, piece = match.groups()
            return f"{mat} {'Chest Armor' if piece == 'Chest' else 'Greaves'}"
    if name.startswith("Helmet"):
        return f"{name[6:]} Helmet"
    if name.startswith("Cape"):
        return f"{name[4:]} Cape"
    if name.startswith("Shield"):
        return f"{name[6:]} Shield"
    if name.startswith("Trophy"):
        return f"{name[6:]} Trophy"
    if name.startswith("Arrow"):
        return f"{name[5:]} Arrow"
    if name.startswith("Bow"):
        return f"{name[3:]} Bow"
    if name.startswith("Axe"):
        return f"{name[3:]} Axe"
    if name.startswith("Sword"):
        return f"{name[5:]} Sword"
    if name.startswith("Mace"):
        return f"{name[4:]} Mace"
    if name.startswith("Spear"):
        return f"{name[5:]} Spear"
    if name.startswith("Atgeir"):
        return f"{name[6:]} Atgeir"
    if name.startswith("Sledge"):
        return f"{name[6:]} Sledge"
    if name.startswith("Pickaxe"):
        return f"{name[7:]} Pickaxe"

    # CamelCase to Words
    return re.sub(r'([a-z])([A-Z])', r'\1 \2', name).replace('_', ' ')

# Scan manifest for items
manifest_path = r'D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\StreamingAssets\SoftRef\manifest_extended'
with open(manifest_path, 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

lines = [l.strip().replace('path in bundle: ', '') for l in text.splitlines() if 'Assets/GameElements/Items/' in l and l.endswith('.prefab') and '/_res/' not in l and '/sfx' not in l and '/vfx' not in l]

items_dict = {}
for l in lines:
    parts = l.split('/')
    if len(parts) < 4: continue
    raw_cat = parts[3]
    if raw_cat in ['customizations']: continue
    name = os.path.splitext(parts[-1])[0]
    
    # Map category to user friendly
    cat = raw_cat.lower()
    if cat == 'helmets': cat = 'armor'
    elif cat == 'shields': cat = 'shields'
    elif cat == 'weapons': cat = 'weapons'
    elif cat == 'armor': cat = 'armor'
    elif cat in ['consumables']: cat = 'consumables'
    elif cat in ['materials', 'pickables']: cat = 'materials'
    elif cat in ['trophies']: cat = 'trophies'
    elif cat in ['tools']: cat = 'tools'
    elif cat in ['valuables', 'trinkets', 'loot']: cat = 'valuables'
    elif cat in ['utility']: cat = 'utility'
    else: cat = 'misc'
    
    # Specific equipment slot
    slot_type = "inventory"
    if "helmet" in name.lower() or raw_cat == 'helmets':
        slot_type = "helmet"
        cat = "armor"
    elif "chest" in name.lower() or "tunic" in name.lower():
        slot_type = "chest"
        cat = "armor"
    elif "legs" in name.lower() or "pants" in name.lower():
        slot_type = "legs"
        cat = "armor"
    elif "cape" in name.lower():
        slot_type = "cape"
        cat = "armor"
    elif "shield" in name.lower() or cat == "shields":
        slot_type = "shield"
    elif cat == "weapons":
        if "arrow" in name.lower() or "bolt" in name.lower():
            slot_type = "ammo"
        else:
            slot_type = "weapon"
    elif cat == "utility" or "belt" in name.lower() or "wishbone" in name.lower():
        slot_type = "utility"
    elif cat == "tools":
        slot_type = "tool"
    
    # Default stack
    max_stack = 1
    if slot_type in ["helmet", "chest", "legs", "cape", "shield", "weapon", "tool", "utility"]:
        max_stack = 1
    elif slot_type == "ammo":
        max_stack = 100
    elif cat == "consumables":
        n_lower = format_display_name(name).lower()
        if any(x in n_lower for x in ["mead", "potion", "wine", "bzerker", "tasty", "base"]):
            max_stack = 10
        elif any(x in n_lower for x in ["berry", "berries", "mushroom", "carrot", "turnip", "onion", "poteitr", "cabbage", "honey", "egg", "barley", "flax", "oat", "kale", "fern", "royal jelly"]):
            if any(x in n_lower for x in ["soup", "stew", "omelette", "stuffed", "pie", "jam", "broth", "pudding", "porridge", "supreme", "cooked", "meatballs", "chicken", "dricka", "shake", "milk", "medley", "marmalade", "baked", "chips", "roasted", "cupcake", "pancake"]):
                max_stack = 20
            else:
                max_stack = 50
        else:
            max_stack = 20
    elif cat == "materials":
        if format_display_name(name).lower() in ["copper", "tin", "iron", "bronze", "silver", "black metal", "flametal"]:
            max_stack = 30
        else:
            max_stack = 50
    elif cat == "trophies":
        max_stack = 20
    elif cat == "valuables":
        max_stack = 999 if "coin" in name.lower() else 50
    else:
        max_stack = 20

    # Max durability
    durability = 100
    if slot_type in ["weapon", "tool", "shield"]:
        durability = 200
        if "iron" in name.lower(): durability = 250
        if "blackmetal" in name.lower(): durability = 300
    elif slot_type in ["helmet", "chest", "legs"]:
        durability = 800
        if "iron" in name.lower(): durability = 1000
    elif slot_type == "cape":
        durability = 400

    icon_fn = find_icon(name)
    hash_code = get_stable_hash_code(name)
    
    items_dict[name] = {
        "prefab": name,
        "hash": hash_code,
        "name": format_display_name(name),
        "category": cat,
        "slotType": slot_type,
        "maxStack": max_stack,
        "maxDurability": durability,
        "icon": icon_fn,
        "weight": 2.0
    }

# Also ensure all items from Knut are explicitly added if missing
knut_items = [
    ("FineWood", "materials", "inventory", 50, 100, "Fine Wood", "finewood.png"),
    ("DeerHide", "materials", "inventory", 50, 100, "Deer Hide", "deerhide.png"),
    ("Resin", "materials", "inventory", 50, 100, "Resin", "resin.png"),
    ("BronzeNails", "materials", "inventory", 100, 100, "Bronze Nails", "bronzenails.png"),
    ("IronNails", "materials", "inventory", 100, 100, "Iron Nails", "ironnails.png"),
    ("CookedDeerMeat", "consumables", "inventory", 20, 100, "Cooked Deer Meat", "deer_meat_cooked.png"),
    ("Honey", "consumables", "inventory", 50, 100, "Honey", "honey.png"),
    ("Iron", "materials", "inventory", 30, 100, "Iron", "iron.png"),
    ("Torch", "weapons", "weapon", 1, 100, "Torch", "groundtorch.png"),
    ("Hoe", "tools", "tool", 1, 200, "Hoe", "hoe.png"),
    ("Hammer", "tools", "tool", 1, 100, "Hammer", "hammer.png"),
    ("AxeBronze", "weapons", "weapon", 1, 125, "Bronze Axe", "axe_bronze.png"),
    ("MaceIron", "weapons", "weapon", 1, 200, "Iron Mace", "MaceIron.png"),
    ("ShieldBanded", "shields", "shield", 1, 200, "Banded Shield", "shield_banded0.png"),
    ("BowHuntsman", "weapons", "weapon", 1, 100, "Huntsman Bow", "bow_huntsman.png"),
    ("ArrowFlint", "weapons", "ammo", 100, 100, "Flint Arrow", "arrow_flint.png"),
    ("PickaxeIron", "tools", "tool", 1, 150, "Iron Pickaxe", "pickaxe_iron.png"),
    ("ArmorRootChest", "armor", "chest", 1, 800, "Root Harnesk", "ArmorRootChest.png"),
    ("ArmorRootLegs", "armor", "legs", 1, 800, "Root Leggings", "ArmorRootLegs.png"),
    ("HelmetRoot", "armor", "helmet", 1, 800, "Root Mask", "HelmetRoot.png"),
    ("CapeTrollHide", "armor", "cape", 1, 500, "Troll Hide Cape", "CapeTrollHide.png"),
    ("BeltStrength", "utility", "utility", 1, 100, "Megingjord", "BeltStrength.png"),
    ("TrinketBronzeStamina", "valuables", "utility", 1, 100, "Bronze Stamina Trinket", "TrinketBronzeStamina.png"),
    ("MeadPoisonResist", "consumables", "inventory", 10, 100, "Poison Resistance Mead", "potion_poisonresist.png"),
]

for prefab, cat, stype, mstack, mdur, dname, icon in knut_items:
    h = get_stable_hash_code(prefab)
    items_dict[prefab] = {
        "prefab": prefab,
        "hash": h,
        "name": dname,
        "category": cat,
        "slotType": stype,
        "maxStack": mstack,
        "maxDurability": mdur,
        "icon": icon,
        "weight": 2.0
    }

items_list = list(items_dict.values())
# Sort by category and name
items_list.sort(key=lambda x: (x["category"], x["name"]))

output_path = r"c:\Users\Jared\Documents\antigravity\goofy-einstein\valheim_items.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(items_list, f, indent=2)

print(f"Generated {len(items_list)} Valheim items in {output_path}!")
icons_with_img = sum(1 for it in items_list if it["icon"])
print(f"Items with icons: {icons_with_img} / {len(items_list)} ({icons_with_img * 100 // len(items_list)}%)")
