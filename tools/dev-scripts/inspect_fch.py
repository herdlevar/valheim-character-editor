import struct, io, hashlib, os

def inspect(fch_path):
    print(f"--- Inspecting {fch_path} ---")
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
    print(f"ver={ver}, c_raw={c_raw}, c_stats={c_stats}")

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
    print(f"Character Name: {pname}, ID: {pid}, seed: {seed}, cheats: {cheats}, have_pdata: {have_pdata}")
    
    if have_pdata:
        pdata = pkg.r_bytes()
        print(f"pdata length: {len(pdata)}")
        sp = ZPkg(pdata)
        p_version = sp.r_int()
        hp = sp.r_float()
        stamina = sp.r_float()
        eitr = sp.r_float() if p_version >= 37 else None
        print(f"Player Data Version: {p_version}, HP: {hp}, Stamina: {stamina}, Eitr: {eitr}")

if __name__ == "__main__":
    inspect(r"C:\Program Files (x86)\Steam\userdata\1622853\892970\remote\characters\knut.fch")
