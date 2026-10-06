import struct, io

fch_path = r"C:\Program Files (x86)\Steam\userdata\1622853\892970\remote\characters\knut.fch"
raw = open(fch_path, "rb").read()
plen = struct.unpack("<i", raw[:4])[0]
orig_payload = raw[4:4+plen]

# Let's search for Hair24ff in orig_payload
idx = orig_payload.find(b"Hair24ff")
print("Hair24ff found at index in payload:", idx)
chunk = orig_payload[idx - 60 : idx + 100]
print("Context around Hair24ff:")
print(chunk)

# Let's parse the floats / ints in this chunk
# In Valheim Player.Save:
# m_skinColor (Vector3 = 3 floats)
# m_hairColor (Vector3 = 3 floats)
# m_hairItem (string)
# m_beardItem (string)
# m_modelIndex (int)
