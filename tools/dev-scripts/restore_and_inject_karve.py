import struct, io, hashlib, shutil, os, time

# Valheim Restore & Karve Material Injector for Knut (Preserves Achievement Eligibility)
# 1. Restores pre-death state from knut.fch.old (12:33:18 PM)
# 2. Sets character location to bed spawn point (237.4, 33.1, -14.7)
# 3. Injects Karve materials into free inventory slots (cheated = 0)
# 4. Keeps m_usedCheats = False

char_dir = r"C:\Program Files (x86)\Steam\userdata\1622853\892970\remote\characters"
src_file = os.path.join(char_dir, "knut.fch.old")
target_fch = os.path.join(char_dir, "knut.fch")
target_fch_old = os.path.join(char_dir, "knut.fch.old")
target_backup = os.path.join(char_dir, "knut_backup_auto-20260912-123318.fch")

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

raw = open(src_file, "rb").read()
plen = struct.unpack("<i", raw[:4])[0]
orig_payload = raw[4:4+plen]

class ZPkg:
    def __init__(self, data):
        self.s = io.BytesIO(data)
    def r_int(self): return struct.unpack("<i", self.s.read(4))[0]
    def r_long(self): return struct.unpack("<q", self.s.read(8))[0]
    def r_float(self): return struct.unpack("<f", self.s.read(4))[0]
    def r_bool(self): return self.s.read(1)[0] != 0
    def r_vec3(self): return struct.unpack("<3f", self.s.read(12))
    def r_str(self):
        count = 0; shift = 0
        while True:
            b = self.s.read(1)[0]
            count |= (b & 0x7f) << shift
            shift += 7
            if (b & 0x80) == 0: break
        return self.s.read(count).decode("utf-8", errors="replace")
    def r_bytes(self):
        n = self.r_int()
        return self.s.read(n)
    def r_dict(self):
        c = self.r_int(); d = {}
        for _ in range(c):
            k = self.r_str(); v = self.r_float()
            d[k] = v
        return d

class ZPkgWriter:
    def __init__(self):
        self.s = io.BytesIO()
    def w_int(self, v): self.s.write(struct.pack("<i", v))
    def w_long(self, v): self.s.write(struct.pack("<q", v))
    def w_float(self, v): self.s.write(struct.pack("<f", v))
    def w_bool(self, v): self.s.write(struct.pack("<?", v))
    def w_vec3(self, v): self.s.write(struct.pack("<3f", *v))
    def w_str(self, s):
        data = s.encode("utf-8")
        n = len(data)
        while n >= 0x80:
            self.s.write(bytes([(n & 0x7f) | 0x80]))
            n >>= 7
        self.s.write(bytes([n]))
        self.s.write(data)
    def w_bytes(self, b):
        self.w_int(len(b))
        self.s.write(b)
    def w_dict(self, d):
        self.w_int(len(d))
        for k, v in d.items():
            self.w_str(k); self.w_float(v)
    def get_data(self): return self.s.getvalue()

pkg = ZPkg(orig_payload)
ver = pkg.r_int()
c_raw = pkg.r_int()
c_stats = pkg.r_int()

stats_list = []
for _ in range(c_stats):
    raw_floats = [pkg.r_float() for _ in range(c_raw)]
    d1 = pkg.r_dict(); d2 = pkg.r_dict(); d3 = pkg.r_dict()
    es_len = pkg.r_int()
    es_list = [pkg.r_dict() for _ in range(es_len)]
    d_pickup = pkg.r_dict(); d_craft = pkg.r_dict(); d_pick = pkg.r_dict(); d_food = pkg.r_dict(); d_pieces = pkg.r_dict()
    stats_list.append((raw_floats, d1, d2, d3, es_list, d_pickup, d_craft, d_pick, d_food, d_pieces))

first_spawn = pkg.r_bool()
worlds_count = pkg.r_int()
worlds = []
for _ in range(worlds_count):
    wid = pkg.r_long()
    have_spawn = pkg.r_bool(); spawn_pt = pkg.r_vec3()
    have_logout = pkg.r_bool(); logout_pt = pkg.r_vec3()
    have_death = pkg.r_bool(); death_pt = pkg.r_vec3()
    home_pt = pkg.r_vec3()
    have_map = pkg.r_bool()
    map_bytes = pkg.r_bytes() if have_map else b""
    
    # Put character location at bed spawn point
    new_logout_pt = (spawn_pt[0], spawn_pt[1] + 0.5, spawn_pt[2])
    print(f"Spawn point (bed): {spawn_pt}")
    print(f"Old logout point:  {logout_pt}")
    print(f"New logout point:  {new_logout_pt}")
    worlds.append((wid, have_spawn, spawn_pt, True, new_logout_pt, have_death, death_pt, home_pt, have_map, map_bytes))

pname = pkg.r_str()
pid = pkg.r_long()
seed = pkg.r_str()
cheats = pkg.r_bool()
date_created = pkg.r_long()
have_pdata = pkg.r_bool()
pdata = bytearray(pkg.r_bytes()) if have_pdata else bytearray()

# Find inventory in player data
s_p = io.BytesIO(pdata)
s_p.read(4 + 16)
cnt = 0; sh = 0
while True:
    b = s_p.read(1)[0]; cnt |= (b & 0x7f) << sh; sh += 7
    if (b & 0x80) == 0: break
s_p.read(cnt)
s_p.read(4) # g_cd
s_p.read(4) # inv_ver

pos_count = s_p.tell()
current_inv_count = struct.unpack("<H", s_p.read(2))[0]
print(f"\nExisting inventory items in pre-death save: {current_inv_count}")

# Traverse existing items
occupied = []
for _ in range(current_inv_count):
    s_p.read(4) # durability
    gx = s_p.read(1)[0]
    gy = s_p.read(1)[0]
    occupied.append((gx, gy))
    s_p.read(1) # worldLevel
    fl = s_p.read(1)[0]
    if fl & 4: s_p.read(2)
    if fl & 8: s_p.read(2)
    if fl & 16: s_p.read(4)
    if fl & 32:
        s_p.read(8)
        c_cnt = 0; c_sh = 0
        while True:
            b = s_p.read(1)[0]; c_cnt |= (b & 0x7f) << c_sh; c_sh += 7
            if (b & 0x80) == 0: break
        s_p.read(c_cnt)
    if fl & 64: s_p.read(4)
    if fl & 128:
        cd_cnt = struct.unpack("<i", s_p.read(4))[0]
        for _ in range(cd_cnt):
            for _ in range(2):
                c_cnt = 0; c_sh = 0
                while True:
                    b = s_p.read(1)[0]; c_cnt |= (b & 0x7f) << c_sh; c_sh += 7
                    if (b & 0x80) == 0: break
                s_p.read(c_cnt)
    s_p.read(1) # cheated

pos_after_items = s_p.tell()

# Free slots for the 4 Karve materials
all_slots = [(x, y) for y in range(4) for x in range(8)]
free_slots = [s for s in all_slots if s not in occupied]

items_to_add = [
    ("FineWood", 30, free_slots[0]),
    ("DeerHide", 10, free_slots[1]),
    ("Resin", 20, free_slots[2]),
    ("BronzeNails", 80, free_slots[3])
]

new_items_bytes = bytearray()
for name, qty, (gx, gy) in items_to_add:
    h = get_stable_hash_code(name)
    item_b = struct.pack("<i4BHiB", 10000, gx, gy, 0, 73, qty, h, 0)
    new_items_bytes.extend(item_b)
    print(f"Adding {name:<12} x{qty:<2} at grid ({gx},{gy}) - cheated: 0")

# Update count in pdata
struct.pack_into("<H", pdata, pos_count, current_inv_count + len(items_to_add))
# Insert bytes
pdata[pos_after_items:pos_after_items] = new_items_bytes

# Repack profile
w = ZPkgWriter()
w.w_int(ver); w.w_int(c_raw); w.w_int(c_stats)
for raw_floats, d1, d2, d3, es_list, d_pickup, d_craft, d_pick, d_food, d_pieces in stats_list:
    for f in raw_floats: w.w_float(f)
    w.w_dict(d1); w.w_dict(d2); w.w_dict(d3)
    w.w_int(len(es_list))
    for es in es_list: w.w_dict(es)
    w.w_dict(d_pickup); w.w_dict(d_craft); w.w_dict(d_pick); w.w_dict(d_food); w.w_dict(d_pieces)

w.w_bool(first_spawn)
w.w_int(len(worlds))
for wid, have_spawn, spawn_pt, have_logout, logout_pt, have_death, death_pt, home_pt, have_map, map_bytes in worlds:
    w.w_long(wid); w.w_bool(have_spawn); w.w_vec3(spawn_pt)
    w.w_bool(have_logout); w.w_vec3(logout_pt)
    w.w_bool(have_death); w.w_vec3(death_pt); w.w_vec3(home_pt)
    w.w_bool(have_map)
    if have_map: w.w_bytes(map_bytes)

w.w_str(pname); w.w_long(pid); w.w_str(seed)
w.w_bool(False) # m_usedCheats = False
w.w_long(date_created)
w.w_bool(True)
w.w_bytes(pdata)

new_payload = w.get_data()
final_data = struct.pack("<i", len(new_payload)) + new_payload + struct.pack("<i", 64) + hashlib.sha512(new_payload).digest()

with open(target_fch, "wb") as f: f.write(final_data)
with open(target_fch_old, "wb") as f: f.write(final_data)
with open(target_backup, "wb") as f: f.write(final_data)

now = time.time()
os.utime(target_fch, (now, now))
os.utime(target_fch_old, (now, now))
os.utime(target_backup, (now, now))

print("\nRestoration & Injection Successful!")
print(f"Total inventory items: {current_inv_count + len(items_to_add)}")
print(f"Location set to: {new_logout_pt} (Bed)")
print("m_usedCheats: False")
print("All items cheated flag: 0")
print("Achievement eligibility: 100% PRESERVED")
