import re, os

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

hashes = [-533689078, -480469634, -1068315380, 200814284, -2074455458, -460902046, -843447246, 616678875, 973754414, 1839036508, -1119196061, -1559009424, 1410944776, 915836683, -1382234189, 795277336, 1601842181, 1502599834, 212315135, 1400949664]
hash_map = {h: None for h in hashes}

valheim_data = r"D:\SteamLibrary\steamapps\common\Valheim\valheim_Data"

found_prefabs = set()
for root, dirs, files in os.walk(valheim_data):
    for fn in files:
        if fn.endswith(('.assets', '.resS', '.bundle', '.resource')) or 'sharedassets' in fn or 'resources' in fn:
            p = os.path.join(root, fn)
            try:
                # Read chunks or whole file
                with open(p, 'rb') as f:
                    content = f.read()
                    matches = re.findall(rb'[A-Za-z][A-Za-z0-9_]{2,35}', content)
                    for m in matches:
                        s = m.decode('ascii')
                        h = get_stable_hash_code(s)
                        if h in hash_map and not hash_map[h]:
                            hash_map[h] = s
                            print(f"Matched {h} -> {s} (from {fn})")
            except Exception as e:
                pass

print("\nFinal match results:")
for h, s in hash_map.items():
    print(f"  {h}: {s}")
