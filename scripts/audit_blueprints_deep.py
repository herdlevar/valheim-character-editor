import os
import re
import json

# Load official pieces
with open('official_hammer_pieces.txt', 'r', encoding='utf-8') as f:
    official_pieces = set(line.strip() for line in f if line.strip())

with open('piece_prefabs_valheim.txt', 'r', encoding='utf-8') as f:
    all_game_prefabs = set(line.strip() for line in f if line.strip())

game_prefabs_lower = {p.lower(): p for p in all_game_prefabs}

# Load plugin aliases
plugin_aliases = {}
with open('src/mod/ValheimLiveBridgePlugin.cs', 'r', encoding='utf-8') as f:
    plugin_text = f.read()

alias_matches = re.findall(r'\{\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\}', plugin_text)
for k, v in alias_matches:
    plugin_aliases[k.lower()] = v

def resolve_prefab(name):
    # 1. Direct game match
    if name in all_game_prefabs:
        return name, "DIRECT_EXACT"
    if name.lower() in game_prefabs_lower:
        return game_prefabs_lower[name.lower()], "DIRECT_CASE"
    # 2. Plugin alias
    if name.lower() in plugin_aliases:
        aliased = plugin_aliases[name.lower()]
        if aliased in all_game_prefabs:
            return aliased, f"ALIASED_EXACT ({name} -> {aliased})"
        if aliased.lower() in game_prefabs_lower:
            return game_prefabs_lower[aliased.lower()], f"ALIASED_CASE ({name} -> {aliased})"
        return aliased, f"ALIASED_BUT_MISSING_IN_GAME ({name} -> {aliased})"
    # 3. Try piece_ prefix
    if f"piece_{name.lower()}" in game_prefabs_lower:
        return game_prefabs_lower[f"piece_{name.lower()}"], f"AUTO_PREFIX (piece_{name})"
    return None, "NOT_FOUND"

print("="*60)
print("1. COMPREHENSIVE PREFAB RESOLUTION AUDIT")
print("="*60)

# Check all blueprints in Valheim folder
bp_dir = r'D:\SteamLibrary\steamapps\common\Valheim\BepInEx\config\PlanBuild\blueprints'
blueprints_data = {}

if os.path.exists(bp_dir):
    for fn in os.listdir(bp_dir):
        if fn.endswith('.blueprint'):
            pieces = []
            with open(os.path.join(bp_dir, fn), 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    if line.startswith('#') or not line.strip(): continue
                    parts = line.strip().split(';')
                    if len(parts) >= 8:
                        pieces.append({
                            'prefab': parts[0],
                            'x': float(parts[2]),
                            'y': float(parts[3]),
                            'z': float(parts[4]),
                            'rx': float(parts[5]),
                            'ry': float(parts[6]),
                            'rz': float(parts[7]),
                            'rw': float(parts[8]) if len(parts) > 8 else 1.0,
                        })
            blueprints_data[fn] = pieces

# Also check presets in blueprintParser.ts
with open('src/utils/blueprintParser.ts', 'r', encoding='utf-8') as f:
    ts_code = f.read()

# Audit each blueprint
for name, pieces in blueprints_data.items():
    print(f"\n--- AUDITING BLUEPRINT: {name} ({len(pieces)} pieces) ---")
    missing = {}
    resolved_aliases = {}
    direct_matches = set()
    
    for p in pieces:
        prefab = p['prefab']
        canonical, status = resolve_prefab(prefab)
        if not canonical or "NOT_FOUND" in status or "MISSING_IN_GAME" in status:
            missing[prefab] = missing.get(prefab, 0) + 1
        elif "ALIASED" in status or "AUTO_PREFIX" in status:
            resolved_aliases[prefab] = (canonical, status, resolved_aliases.get(prefab, (canonical, status, 0))[2] + 1)
        else:
            direct_matches.add(prefab)
            
    print(f"  Valid Direct Prefabs: {len(direct_matches)}")
    if resolved_aliases:
        print("  Prefabs relying on Aliases:")
        for orig, (canon, stat, count) in resolved_aliases.items():
            print(f"    * '{orig}' x{count} -> '{canon}' [{stat}]")
    if missing:
        print("  CRITICAL BROKEN PREFABS (WILL FAIL TO SPAWN IN VALHEIM):")
        for orig, count in missing.items():
            print(f"    [FAIL] '{orig}' x{count} pieces cannot be spawned!")
    else:
        print("  ALL PREFABS VALID!")

