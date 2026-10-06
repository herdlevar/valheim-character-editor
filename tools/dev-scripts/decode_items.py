import struct, io

fch_path = r"C:\Program Files (x86)\Steam\userdata\1622853\892970\remote\characters\knut.fch"
raw = open(fch_path, "rb").read()
plen = struct.unpack("<i", raw[:4])[0]
orig_payload = raw[4:4+plen]

class ZPkg:
    def __init__(self, data): self.s = io.BytesIO(data)
    def r_int(self): return struct.unpack("<i", self.s.read(4))[0]
    def r_ushort(self): return struct.unpack("<H", self.s.read(2))[0]
    def r_byte(self): return self.s.read(1)[0]
    def r_long(self): return struct.unpack("<q", self.s.read(8))[0]
    def r_float(self): return struct.unpack("<f", self.s.read(4))[0]
    def r_bool(self): return self.s.read(1)[0] != 0
    def r_vec3(self): return struct.unpack("<3f", self.s.read(12))
    def r_str(self):
        count = 0; shift = 0
        while True:
            b = self.s.read(1)[0]; count |= (b & 0x7f) << shift; shift += 7
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

pkg = ZPkg(orig_payload)
ver = pkg.r_int(); c_raw = pkg.r_int(); c_stats = pkg.r_int()
for _ in range(c_stats):
    raw_floats = [pkg.r_float() for _ in range(c_raw)]
    d1 = pkg.r_dict(); d2 = pkg.r_dict(); d3 = pkg.r_dict()
    es_len = pkg.r_int()
    es_list = [pkg.r_dict() for _ in range(es_len)]
    d_pickup = pkg.r_dict(); d_craft = pkg.r_dict(); d_pick = pkg.r_dict(); d_food = pkg.r_dict(); d_pieces = pkg.r_dict()
first_spawn = pkg.r_bool(); worlds_count = pkg.r_int()
for _ in range(worlds_count):
    wid = pkg.r_long()
    have_spawn = pkg.r_bool(); spawn_pt = pkg.r_vec3()
    have_logout = pkg.r_bool(); logout_pt = pkg.r_vec3()
    have_death = pkg.r_bool(); death_pt = pkg.r_vec3()
    home_pt = pkg.r_vec3(); have_map = pkg.r_bool()
    map_bytes = pkg.r_bytes() if have_map else b""
pname = pkg.r_str(); pid = pkg.r_long(); seed = pkg.r_str(); cheats = pkg.r_bool()
date_created = pkg.r_long(); have_pdata = pkg.r_bool()
pdata = pkg.r_bytes()

s_p = ZPkg(pdata)
p_ver = s_p.r_int()
hp = s_p.r_float()
stamina = s_p.r_float()
f3 = s_p.r_float()
f4 = s_p.r_float()
g_power = s_p.r_str()
g_cd = s_p.r_float()
inv_ver = s_p.r_int()
inv_cnt = s_p.r_ushort()
print(f"Inventory version: {inv_ver}, item count: {inv_cnt}")

decoded_items = []
for i in range(inv_cnt):
    durability_raw = s_p.r_int()
    durability = durability_raw / 100.0
    gx = s_p.r_byte()
    gy = s_p.r_byte()
    worldLevel = s_p.r_byte()
    fl = s_p.r_byte()
    
    pickedUp = bool(fl & 0x01)
    equipped = bool(fl & 0x02)
    quality = s_p.r_ushort() if (fl & 0x04) else 1
    stack = s_p.r_ushort() if (fl & 0x08) else 1
    variant = s_p.r_int() if (fl & 0x10) else 0
    crafterID = 0
    crafterName = ""
    if fl & 0x20:
        crafterID = s_p.r_long()
        crafterName = s_p.r_str()
    prefab_hash = s_p.r_int() if (fl & 0x40) else 0
    customData = {}
    if fl & 0x80:
        cd_cnt = s_p.r_int()
        for _ in range(cd_cnt):
            k = s_p.r_str()
            v = s_p.r_str()
            customData[k] = v
    cheated = s_p.r_byte()
    
    decoded_items.append({
        'slot': (gx, gy),
        'prefab_hash': prefab_hash,
        'stack': stack,
        'durability': durability,
        'quality': quality,
        'variant': variant,
        'equipped': equipped,
        'crafterName': crafterName,
        'customData': customData,
        'cheated': cheated
    })

print(f"Successfully decoded {len(decoded_items)} items:")
for it in decoded_items:
    print(f"Slot ({it['slot'][0]},{it['slot'][1]}): hash={it['prefab_hash']} stack={it['stack']} dur={it['durability']} qual={it['quality']} eq={it['equipped']}")

# Now let's see what comes AFTER inventory!
rest_data = s_p.s.read()
print(f"Bytes remaining in pdata after inventory: {len(rest_data)}")
