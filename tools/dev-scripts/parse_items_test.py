import io, struct

# Let's inspect knut.fch items
fch_path = r"C:\Program Files (x86)\Steam\userdata\1622853\892970\remote\characters\knut.fch"
raw = open(fch_path, "rb").read()
plen = struct.unpack("<i", raw[:4])[0]
orig_payload = raw[4:4+plen]

class ZPkg:
    def __init__(self, data):
        self.s = io.BytesIO(data)
    def r_int(self): return struct.unpack("<i", self.s.read(4))[0]
    def r_short(self): return struct.unpack("<h", self.s.read(2))[0]
    def r_ushort(self): return struct.unpack("<H", self.s.read(2))[0]
    def r_byte(self): return self.s.read(1)[0]
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

pkg = ZPkg(orig_payload)
ver = pkg.r_int()
c_raw = pkg.r_int()
c_stats = pkg.r_int()

for _ in range(c_stats):
    raw_floats = [pkg.r_float() for _ in range(c_raw)]
    d1 = pkg.r_dict(); d2 = pkg.r_dict(); d3 = pkg.r_dict()
    es_len = pkg.r_int()
    es_list = [pkg.r_dict() for _ in range(es_len)]
    d_pickup = pkg.r_dict(); d_craft = pkg.r_dict(); d_pick = pkg.r_dict(); d_food = pkg.r_dict(); d_pieces = pkg.r_dict()

first_spawn = pkg.r_bool()
worlds_count = pkg.r_int()
for _ in range(worlds_count):
    wid = pkg.r_long()
    have_spawn = pkg.r_bool(); spawn_pt = pkg.r_vec3()
    have_logout = pkg.r_bool(); logout_pt = pkg.r_vec3()
    have_death = pkg.r_bool(); death_pt = pkg.r_vec3()
    home_pt = pkg.r_vec3()
    have_map = pkg.r_bool()
    map_bytes = pkg.r_bytes() if have_map else b""

pname = pkg.r_str()
pid = pkg.r_long()
seed = pkg.r_str()
cheats = pkg.r_bool()
date_created = pkg.r_long()
have_pdata = pkg.r_bool()
pdata = pkg.r_bytes()

sp = io.BytesIO(pdata)
p_ver = struct.unpack("<i", sp.read(4))[0]
print(f"p_ver: {p_ver}")
# Let's inspect fields before inventory:
# Player.Load in Valheim:
# if (version >= 7) m_maxHealth = pkg.ReadSingle();
# if (version >= 20) m_stamina = pkg.ReadSingle();
# if (version >= 37) m_eitr = pkg.ReadSingle();
# if (version >= 7) m_firstSpawn = pkg.ReadBool();
# if (version >= 28) m_timeSinceDeath = pkg.ReadSingle();
# m_guardianPower = pkg.ReadString();
# if (version >= 29) m_guardianPowerCooldown = pkg.ReadSingle();
# if (version >= 4) Inventory.Load(pkg);
hp = struct.unpack("<f", sp.read(4))[0]
print(f"hp: {hp}")
stamina = struct.unpack("<f", sp.read(4))[0]
print(f"stamina: {stamina}")
if p_ver >= 37:
    eitr = struct.unpack("<f", sp.read(4))[0]
    print(f"eitr: {eitr}")
first_spawn_p = sp.read(1)[0] != 0
print(f"first_spawn_p: {first_spawn_p}")
if p_ver >= 28:
    time_since_death = struct.unpack("<f", sp.read(4))[0]
    print(f"time_since_death: {time_since_death}")

# Guardian power string
cnt = 0; sh = 0
while True:
    b = sp.read(1)[0]
    cnt |= (b & 0x7f) << sh; sh += 7
    if (b & 0x80) == 0: break
g_power = sp.read(cnt).decode("utf-8")
print(f"g_power: {g_power}")
g_cd = struct.unpack("<f", sp.read(4))[0]
print(f"g_cd: {g_cd}")

# Inventory.Load:
inv_ver = struct.unpack("<i", sp.read(4))[0]
inv_count = struct.unpack("<H", sp.read(2))[0]
print(f"inv_ver: {inv_ver}, items count: {inv_count}")

items = []
for i in range(inv_count):
    start_pos = sp.tell()
    durability = struct.unpack("<f", sp.read(4))[0]
    gx = sp.read(1)[0]
    gy = sp.read(1)[0]
    worldLevel = sp.read(1)[0]
    fl = sp.read(1)[0]
    
    # Let's inspect flags:
    # bit 0 (1): equipped?
    # bit 1 (2): ???
    # bit 2 (4): quality
    # bit 3 (8): variant
    # bit 4 (16): stack
    # bit 5 (32): crafterID & crafterName
    # bit 6 (64): hash or value?
    # Let's see what is read
    extra = {}
    if fl & 1: extra['flag_1'] = True
    if fl & 2: extra['flag_2'] = True
    if fl & 4:
        extra['quality'] = struct.unpack("<h", sp.read(2))[0]
    if fl & 8:
        extra['variant'] = struct.unpack("<h", sp.read(2))[0]
    if fl & 16:
        extra['val_16'] = struct.unpack("<i", sp.read(4))[0]
    if fl & 32:
        crafter_id = struct.unpack("<q", sp.read(8))[0]
        c_cnt = 0; c_sh = 0
        while True:
            b = sp.read(1)[0]; c_cnt |= (b & 0x7f) << c_sh; c_sh += 7
            if (b & 0x80) == 0: break
        crafter_name = sp.read(c_cnt).decode("utf-8", errors="replace")
        extra['crafter'] = (crafter_id, crafter_name)
    if fl & 64:
        extra['hash_or_val64'] = struct.unpack("<i", sp.read(4))[0]
    if fl & 128:
        cd_cnt = struct.unpack("<i", sp.read(4))[0]
        cd = {}
        for _ in range(cd_cnt):
            # key
            c_cnt = 0; c_sh = 0
            while True:
                b = sp.read(1)[0]; c_cnt |= (b & 0x7f) << c_sh; c_sh += 7
                if (b & 0x80) == 0: break
            k = sp.read(c_cnt).decode("utf-8", errors="replace")
            # val
            c_cnt = 0; c_sh = 0
            while True:
                b = sp.read(1)[0]; c_cnt |= (b & 0x7f) << c_sh; c_sh += 7
                if (b & 0x80) == 0: break
            v = sp.read(c_cnt).decode("utf-8", errors="replace")
            cd[k] = v
        extra['customData'] = cd
    cheated = sp.read(1)[0]
    items.append({
        'pos': (gx, gy),
        'durability': durability,
        'worldLevel': worldLevel,
        'flags': bin(fl),
        'extra': extra,
        'cheated': cheated
    })

print(f"Read {len(items)} items:")
for it in items[:10]:
    print(it)

# What is AFTER inventory in pdata?
after_inv_pos = sp.tell()
print(f"Bytes remaining after inventory: {len(pdata) - after_inv_pos}")
