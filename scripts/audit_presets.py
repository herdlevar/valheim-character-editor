import re
from audit_blueprints_deep import resolve_prefab

with open('src/utils/blueprintParser.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Find all functions create*Pieces()
func_matches = re.findall(r'function (create\w+Pieces)\(\).*?\{(.*?)\n\}', text, re.DOTALL)
print(f'Found {len(func_matches)} preset generator functions:')
for fname, fbody in func_matches:
    print(f'\n--- {fname} ---')
    prefabs = re.findall(r"prefab:\s*['\"]([^'\"]+)['\"]", fbody)
    unique_p = set(prefabs)
    for p in sorted(unique_p):
        canon, stat = resolve_prefab(p)
        if not canon or 'NOT_FOUND' in stat or 'MISSING_IN_GAME' in stat:
            print(f'  [FAIL] {p} -> {stat}')
        elif 'ALIASED' in stat or 'AUTO_PREFIX' in stat:
            print(f'  [ALIAS] {p} -> {canon} ({stat})')
        else:
            print(f'  [OK] {p} ({canon})')
