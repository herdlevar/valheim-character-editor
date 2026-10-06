import re

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

# Load strings from assembly_valheim.dll
with open(r"D:\SteamLibrary\steamapps\common\Valheim\valheim_Data\Managed\assembly_valheim.dll", "rb") as f:
    dll = f.read()

# Also let's check ObjectDB in assembly_valheim or resources
hashes = [-533689078, -480469634, -1068315380, 200814284, -2074455458, -460902046, -843447246, 616678875, 973754414, 1839036508, -1119196061, -1559009424, 1410944776, 915836683, -1382234189, 795277336, 1601842181, 1502599834, 212315135, 1400949664]

hash_map = {h: None for h in hashes}

# Find ascii strings
words = set(re.findall(rb'[A-Za-z0-9_]{3,40}', dll))
print(f"Found {len(words)} candidate strings in dll")

for w in words:
    s = w.decode('ascii')
    h = get_stable_hash_code(s)
    if h in hash_map:
        hash_map[h] = s

matched = {h: s for h, s in hash_map.items() if s}
print(f"Matched {len(matched)} of {len(hashes)} items from DLL strings:")
for h, s in hash_map.items():
    print(f"  {h}: {s}")
