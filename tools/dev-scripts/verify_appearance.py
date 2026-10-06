import struct, io

fch_path = r"C:\Program Files (x86)\Steam\userdata\1622853\892970\remote\characters\knut.fch"
raw = open(fch_path, "rb").read()
plen = struct.unpack("<i", raw[:4])[0]
orig_payload = raw[4:4+plen]

idx = orig_payload.find(b"Beard19")
# 1 byte before Beard19 is length (7)
stream = io.BytesIO(orig_payload[idx - 1:])

def r_str(s):
    count = 0; shift = 0
    while True:
        b = s.read(1)[0]
        count |= (b & 0x7f) << shift
        shift += 7
        if (b & 0x80) == 0: break
    return s.read(count).decode("utf-8")

beard = r_str(stream)
hair = r_str(stream)
skin_r, skin_g, skin_b = struct.unpack("<3f", stream.read(12))
hair_r, hair_g, hair_b = struct.unpack("<3f", stream.read(12))
model_idx = struct.unpack("<i", stream.read(4))[0]

print(f"Beard: {beard}")
print(f"Hair: {hair}")
print(f"Skin Color: ({skin_r:.3f}, {skin_g:.3f}, {skin_b:.3f})")
print(f"Hair Color: ({hair_r:.3f}, {hair_g:.3f}, {hair_b:.3f})")
print(f"Model Index: {model_idx} ({'Male' if model_idx == 0 else 'Female'})")

# Foods
food_count = struct.unpack("<i", stream.read(4))[0]
print(f"Foods ({food_count}):")
for _ in range(food_count):
    fname = r_str(stream)
    fval = struct.unpack("<f", stream.read(4))[0]
    print(f"  Food: {fname}, remaining: {fval}")
