import struct

with open(r"C:\Program Files (x86)\Steam\userdata\1622853\892970\remote\characters\knut.fch", "rb") as f:
    data = f.read()

# The first 4 bytes is length of payload
payload_len = struct.unpack("<I", data[:4])[0]
payload = data[4:4+payload_len]

# In payload:
# version (int32)
# kills, deaths, crafts, builds (int32 each)
# worlds count
offset = 0
ver = struct.unpack_from("<I", payload, offset)[0]
offset += 4
kills, deaths, crafts, builds = struct.unpack_from("<IIII", payload, offset)
offset += 16
worlds_count = struct.unpack_from("<I", payload, offset)[0]
offset += 4
print(f"Version: {ver}, Worlds count: {worlds_count}")

for i in range(worlds_count):
    worldId = struct.unpack_from("<q", payload, offset)[0]
    offset += 8
    haveSpawn = struct.unpack_from("<?", payload, offset)[0]
    offset += 1
    spawnPoint = struct.unpack_from("<fff", payload, offset)
    offset += 12
    haveLogout = struct.unpack_from("<?", payload, offset)[0]
    offset += 1
    logoutPoint = struct.unpack_from("<fff", payload, offset)
    offset += 12
    haveDeath = struct.unpack_from("<?", payload, offset)[0]
    offset += 1
    deathPoint = struct.unpack_from("<fff", payload, offset)
    offset += 12
    homePoint = struct.unpack_from("<fff", payload, offset)
    offset += 12
    haveMap = struct.unpack_from("<?", payload, offset)[0]
    offset += 1
    mapLen = 0
    if haveMap:
        mapLen = struct.unpack_from("<I", payload, offset)[0]
        offset += 4
        mapBytes = payload[offset:offset+mapLen]
        offset += mapLen
    print(f"World {i}: ID={worldId}, haveSpawn={haveSpawn}, haveMap={haveMap}, mapBytesLen={mapLen}")
