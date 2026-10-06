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

with open(r'D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\StreamingAssets\SoftRef\manifest_extended', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

# Find all file basenames (e.g. SwordIron from SwordIron.prefab)
names = set(re.findall(r'/([A-Za-z0-9_]+)\.prefab', text))
# Also without path
names.update(re.findall(r'([A-Za-z0-9_]+)\.prefab', text))
print(f"Candidate prefab names: {len(names)}")

for name in names:
    h = get_stable_hash_code(name)
    if h in hash_map:
        hash_map[h] = name

print("\nMatched inventory items for Knut:")
for h, s in hash_map.items():
    print(f"  {h}: {s}")
