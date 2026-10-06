import os
import re
import json

with open('piece_prefabs_valheim.txt', 'r', encoding='utf-8') as f:
    all_game_prefabs = set(line.strip() for line in f if line.strip())

game_prefabs_lower = {p.lower(): p for p in all_game_prefabs}

# Check PrefabAliases in ValheimLiveBridgePlugin.cs
plugin_aliases = {}
with open('src/mod/ValheimLiveBridgePlugin.cs', 'r', encoding='utf-8') as f:
    plugin_text = f.read()

alias_matches = re.findall(r'\{\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\}', plugin_text)
for k, v in alias_matches:
    plugin_aliases[k.lower()] = v

# Collect all prefabs used in blueprints
used_prefabs = set()

# 1. From blueprintParser.ts
with open('src/utils/blueprintParser.ts', 'r', encoding='utf-8') as f:
    bp_text = f.read()
matches = re.findall(r"prefab:\s*['\"]([^'\"]+)['\"]", bp_text)
for m in matches:
    used_prefabs.add(m)

# 2. From .blueprint files on disk
bp_dir = r'D:\SteamLibrary\steamapps\common\Valheim\BepInEx\config\PlanBuild\blueprints'
if os.path.exists(bp_dir):
    for fn in os.listdir(bp_dir):
        if fn.endswith('.blueprint'):
            with open(os.path.join(bp_dir, fn), 'r', encoding='utf-8') as f:
                for line in f:
                    if line.startswith('#') or not line.strip(): continue
                    parts = line.strip().split(';')
                    if parts:
                        used_prefabs.add(parts[0])

print(f'Total distinct prefabs used across all blueprints: {len(used_prefabs)}')

results = []
for p in sorted(used_prefabs):
    direct = p in all_game_prefabs or p.lower() in game_prefabs_lower
    resolved = plugin_aliases.get(p.lower(), p)
    resolved_in_game = resolved in all_game_prefabs or resolved.lower() in game_prefabs_lower
    results.append({
        'used': p,
        'direct_in_game': direct,
        'canonical_game_name': game_prefabs_lower.get(p.lower(), None),
        'resolved_alias': resolved,
        'resolved_in_game': resolved_in_game,
        'resolved_canonical': game_prefabs_lower.get(resolved.lower(), None)
    })

print('\n=== PREFAB VALIDATION AUDIT ===')
issues = []
resolved_count = 0
valid_count = 0

for r in results:
    if not r['direct_in_game'] and not r['resolved_in_game']:
        print(f"[CRITICAL FAIL] '{r['used']}' - NOT FOUND in game or aliases!")
        issues.append(r)
    elif not r['direct_in_game'] and r['resolved_in_game']:
        print(f"[ALIAS OK] '{r['used']}' -> '{r['resolved_alias']}' (game has '{r['resolved_canonical']}')")
        resolved_count += 1
    else:
        print(f"[DIRECT OK] '{r['used']}' (in game as '{r['canonical_game_name']}')")
        valid_count += 1

print(f'\nAudit Summary: {valid_count} direct matches, {resolved_count} alias resolved, {len(issues)} critical missing/broken prefabs.')
