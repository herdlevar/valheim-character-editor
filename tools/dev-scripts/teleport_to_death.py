import struct, io, os, hashlib, time, shutil, subprocess

def is_valheim_running():
    try:
        output = subprocess.check_output('tasklist /FI "IMAGENAME eq valheim.exe"', shell=True).decode()
        return "valheim.exe" in output.lower()
    except Exception:
        return False

def teleport_to_death(char_name="knut"):
    if is_valheim_running():
        print("ERROR: Valheim is currently running! Please exit the game to the main menu or desktop first so your save is not overwritten.")
        return False

    winSteam = r"C:\Program Files (x86)\Steam\userdata\1622853\892970\remote\characters"
    fch_path = os.path.join(winSteam, f"{char_name}.fch")
    fch_old_path = os.path.join(winSteam, f"{char_name}.fch.old")

    if not os.path.exists(fch_path):
        print(f"ERROR: Character save file not found at {fch_path}")
        return False

    raw = open(fch_path, "rb").read()
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
    death_info = []

    for _ in range(worlds_count):
        wid = pkg.r_long()
        have_spawn = pkg.r_bool(); spawn_pt = pkg.r_vec3()
        have_logout = pkg.r_bool(); logout_pt = pkg.r_vec3()
        have_death = pkg.r_bool(); death_pt = pkg.r_vec3()
        home_pt = pkg.r_vec3()
        have_map = pkg.r_bool()
        map_bytes = pkg.r_bytes() if have_map else b""

        if have_death:
            # Elevation +0.5 safely places character standing on ground
            new_logout_pt = (death_pt[0], death_pt[1] + 0.5, death_pt[2])
            death_info.append((wid, death_pt, logout_pt, new_logout_pt))
            worlds.append((wid, have_spawn, spawn_pt, True, new_logout_pt, have_death, death_pt, home_pt, have_map, map_bytes))
        else:
            worlds.append((wid, have_spawn, spawn_pt, have_logout, logout_pt, have_death, death_pt, home_pt, have_map, map_bytes))

    if not death_info:
        print("No death coordinates found in this character's save file.")
        return False

    pname = pkg.r_str()
    pid = pkg.r_long()
    seed = pkg.r_str()
    cheats = pkg.r_bool()
    date_created = pkg.r_long()
    have_pdata = pkg.r_bool()
    pdata = pkg.r_bytes() if have_pdata else b""

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
    w.w_bool(cheats)
    w.w_long(date_created)
    w.w_bool(have_pdata)
    if have_pdata: w.w_bytes(pdata)

    new_payload = w.get_data()
    final_data = struct.pack("<i", len(new_payload)) + new_payload + struct.pack("<i", 64) + hashlib.sha512(new_payload).digest()

    # 1. Create safety backup
    stamp = time.strftime("%Y%m%d-%H%M%S")
    backup_file = os.path.join(winSteam, f"{char_name}_backup_before_death_teleport-{stamp}.fch")
    shutil.copyfile(fch_path, backup_file)
    print(f"Safety backup created at: {backup_file}")

    # 2. Write updated .fch and .fch.old
    with open(fch_path, "wb") as f: f.write(final_data)
    with open(fch_old_path, "wb") as f: f.write(final_data)

    # 3. Update timestamps
    now = time.time()
    os.utime(fch_path, (now, now))
    os.utime(fch_old_path, (now, now))

    print(f"\nSUCCESS! Character '{pname}' teleported to last death location:")
    for wid, death_pt, old_logout, new_logout in death_info:
        print(f"  World {wid}:")
        print(f"    Grave marker: ({death_pt[0]:.2f}, {death_pt[1]:.2f}, {death_pt[2]:.2f})")
        print(f"    Old spawn/bed: ({old_logout[0]:.2f}, {old_logout[1]:.2f}, {old_logout[2]:.2f})")
        print(f"    New login pt: ({new_logout[0]:.2f}, {new_logout[1]:.2f}, {new_logout[2]:.2f})")
    print("\nWhen you start Valheim and select this character, you will log in directly at your grave!")
    return True

if __name__ == "__main__":
    teleport_to_death("knut")
